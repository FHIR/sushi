#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import cloneDeep from 'lodash/cloneDeep';
import { importText, FSHTank, RawFSH, importConfiguration } from './import';
import { exportFHIR, Package } from './export';
import { IGExporter } from './ig';
import { logger, stats, Type } from './utils';
import { loadDependency, loadCustomResources } from './fhirdefs';
import { FHIRDefinitions } from './fhirdefs';
import {
  filterInlineInstances,
  filterExampleInstances,
  filterCapabilitiesInstances,
  filterVocabularyInstances,
  filterModelInstances,
  filterOperationInstances,
  filterExtensionInstances,
  filterProfileInstances
} from './utils';
import { pad, padStart, sample, padEnd } from 'lodash';
import chalk from 'chalk';
import { Configuration } from './fshtypes';

app().catch(e => {
  logger.error(`SUSHI encountered the following unexpected error: ${e.message}`);
  process.exit(1);
});

async function app() {
  let input: string;

  program
    .name('sushi')
    .usage('[path-to-fsh-defs] [options]')
    .option('-o, --out <out>', 'the path to the output folder')
    .option('-d, --debug', 'output extra debugging information')
    .option('-s, --snapshot', 'generate snapshot in Structure Definition output', false)
    .version(getVersion(), '-v, --version', 'print SUSHI version')
    .on('--help', () => {
      console.log('');
      console.log('Additional information:');
      console.log('  [path-to-fsh-defs]');
      console.log('    Default: "."');
      console.log('    If fsh/ subdirectory present, it is included in [path-to-fsh-defs]');
      console.log('  -o, --out <out>');
      console.log('    Default: "build"');
      console.log('    If fsh/ subdirectory present, default output is one directory above fsh/');
    })
    .arguments('[path-to-fsh-defs]')
    .action(function (pathToFshDefs) {
      input = pathToFshDefs;
    })
    .parse(process.argv);

  if (program.debug) logger.level = 'debug';

  logger.info(`Running SUSHI ${getVersion()}`);

  // If no input folder is specified, set default to current directory
  if (!input) {
    input = '.';
    logger.info('path-to-fsh-defs defaulted to current working directory');
  }

  // Use fsh/ subdirectory if not already specified and present
  const fshSubdirectoryPath = path.join(input, 'fsh');
  if (fs.existsSync(fshSubdirectoryPath)) {
    input = path.join(input, 'fsh');
    logger.info('fsh/ subdirectory detected and add to input path');
  }

  // If a fsh subdirectory is used, we are in an IG Publisher context
  const isIgPubContext = path.parse(input).base === 'fsh';
  if (isIgPubContext) {
    logger.info(
      'Current FSH tank conforms to an IG Publisher context. Output will be adjusted accordingly.'
    );
  }

  let files: string[];
  try {
    files = getFilesRecursive(input);
  } catch {
    logger.error('Invalid path to FSH definition folder.');
    program.outputHelp();
    process.exit(1);
  }

  // If the config.yaml file exists, parse it; otherwise skip for now (until we fully support it)
  let config: Configuration;
  const configPath = path.join(input, 'config.yaml');
  if (fs.existsSync(configPath)) {
    const configYaml = fs.readFileSync(configPath, 'utf8');
    try {
      config = importConfiguration(configYaml, configPath);
    } catch (e) {
      process.exit(1);
    }
  }

  // Check that package.json exists
  const packagePath = path.join(input, 'package.json');
  if (!fs.existsSync(packagePath)) {
    logger.error('No package.json in FSH definition folder.');
    process.exit(1);
  }

  // Parse package.json
  let packageJSON: any;
  try {
    packageJSON = fs.readJSONSync(packagePath);
  } catch (e) {
    logger.error(`The package.json file is not valid JSON: ${packagePath}`);
    process.exit(1);
  }

  // Ensure FHIR R4 is added as a fhirVersion
  const dependencies = config.dependencies ?? [];
  if (!config.fhirVersion.includes('4.0.1')) {
    logger.error(
      'The config.yaml must specify FHIR R4 as a fhirVersion. Be sure to' +
        ' add "fhirVersion: 4.0.1" to the config.yaml file.'
    );
    process.exit(1);
  } else {
    // Add hl7.fhir.r4.core so that it will be loaded as dependency
    dependencies.push({ packageId: 'hl7.fhir.r4.core', version: '4.0.1' });
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  const dependencyDefs: Promise<FHIRDefinitions | void>[] = [];
  for (const dep of dependencies) {
    dependencyDefs.push(
      loadDependency(dep.packageId, dep.version, defs)
        .then(def => {
          logger.info(`Loaded package ${dep.packageId}#${dep.version}`);
          return def;
        })
        .catch(e => {
          logger.error(`Failed to load ${dep.packageId}#${dep.version}`);
          logger.error(e.message);
        })
    );
  }

  // Load custom resources specified in ig-data folder
  loadCustomResources(input, defs);

  const rawFSHes = files
    .filter(file => file.endsWith('.fsh'))
    .map(file => {
      const filePath = path.resolve(file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return new RawFSH(fileContent, filePath);
    });

  logger.info('Importing FSH text...');
  const docs = importText(rawFSHes);

  const tank = new FSHTank(docs, packageJSON, config);
  await Promise.all(dependencyDefs);

  // Check for StructureDefinition
  const structDef = defs.fishForFHIR('StructureDefinition', Type.Resource);
  if (structDef?.version !== '4.0.1') {
    logger.error(
      'StructureDefinition resource not found for v4.0.1. The FHIR R4 package in local cache' +
        ' may be corrupt. Local FHIR cache can be found at <home-directory>/.fhir/packages.' +
        ' For more information, see https://wiki.hl7.org/FHIR_Package_Cache#Location.'
    );
    process.exit(1);
  }

  logger.info('Converting FSH to FHIR resources...');
  const outPackage = exportFHIR(tank, defs);

  let outDir = program.out;
  if (isIgPubContext && !program.out) {
    // When running in an IG Publisher context, default output is the parent folder of the tank
    outDir = path.join(input, '..');
    logger.info(`No output path specified. Output to ${outDir}`);
  } else if (!program.out) {
    // Any other time, default output is just to 'build'
    outDir = path.join('.', 'build');
    logger.info(`No output path specified. Output to ${outDir}`);
  }
  fs.ensureDirSync(outDir);

  fs.writeFileSync(
    path.join(outDir, 'package.json'),
    JSON.stringify(outPackage.packageJSON, null, 2),
    'utf8'
  );

  logger.info('Exporting FHIR resources as JSON...');
  let count = 0;
  const writeResources = (
    folder: string,
    resources: { getFileName: () => string; toJSON: (snapshot: boolean) => any }[]
  ) => {
    const exportDir = path.join(outDir, 'input', folder);
    resources.forEach(resource => {
      fs.outputJSONSync(
        path.join(exportDir, resource.getFileName()),
        resource.toJSON(program.snapshot),
        {
          spaces: 2
        }
      );
      count++;
    });
  };
  writeResources('profiles', outPackage.profiles);
  writeResources('extensions', outPackage.extensions);
  writeResources('vocabulary', [...outPackage.valueSets, ...outPackage.codeSystems]);

  // Sort instances into appropriate directories
  const instances = cloneDeep(outPackage.instances); // Filter functions below mutate the argument, so clone what is in the package
  filterInlineInstances(instances);
  writeResources('examples', filterExampleInstances(instances));
  writeResources('capabilities', filterCapabilitiesInstances(instances));
  writeResources('vocabulary', filterVocabularyInstances(instances));
  writeResources('models', filterModelInstances(instances));
  writeResources('operations', filterOperationInstances(instances));
  writeResources('extensions', filterExtensionInstances(instances));
  writeResources('profiles', filterProfileInstances(instances));
  writeResources('resources', instances); // Any instance left cannot be categorized any further so should just be in generic resources

  logger.info(`Exported ${count} FHIR resources as JSON.`);

  // If FSHOnly is true in the config, do not generate IG content, otherwise, generate IG content
  if (config.FSHOnly) {
    logger.info('Exporting FSH definitions only. No IG related content will be exported.');
  } else {
    const igDataPath = path.resolve(input, 'ig-data');
    logger.info('Assembling Implementation Guide sources...');
    const igExporter = new IGExporter(outPackage, defs, igDataPath, isIgPubContext);
    igExporter.export(outDir);
    logger.info('Assembled Implementation Guide sources; ready for IG Publisher.');
  }

  console.log();
  printResults(outPackage, !config.FSHOnly);

  const exitCode = stats.numError > 0 ? 1 : 0;
  process.exit(exitCode);
}

function getVersion(): string {
  const packageJSONPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJSONPath)) {
    const packageJSON = fs.readJSONSync(packageJSONPath);
    return `v${packageJSON.version}`;
  }
  return 'unknown';
}

function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}

function printResults(pkg: Package, isIG: boolean) {
  // NOTE: These variables are creatively names to align well in the strings below while keeping prettier happy
  const prNum = pad(pkg.profiles.length.toString(), 8);
  const extnNum = pad(pkg.extensions.length.toString(), 10);
  const vstNum = pad(pkg.valueSets.length.toString(), 9);
  const cdsysNum = pad(pkg.codeSystems.length.toString(), 11);
  const insNum = pad(pkg.instances.length.toString(), 9);
  const errorNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 13);
  const wrNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);
  let resultStatus: ResultStatus;
  if (stats.numError === 0 && stats.numWarn === 0) {
    resultStatus = 'clean';
  } else if (stats.numError > 0) {
    resultStatus = 'errors';
  } else {
    resultStatus = 'warnings';
  }
  const aWittyMessageInvolvingABadFishPun = padEnd(sample(MESSAGE_MAP[resultStatus]), 36);
  const clr = COLOR_MAP[resultStatus];

  // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
  const results = [
    clr('╔' + '════════════════════════ SUSHI RESULTS ══════════════════════════' + '' + '╗'),
    clr('║') + ' ╭──────────┬────────────┬───────────┬─────────────┬───────────╮ ' + clr('║'),
    clr('║') + ' │ Profiles │ Extensions │ ValueSets │ CodeSystems │ Instances │ ' + clr('║'),
    clr('║') + ' ├──────────┼────────────┼───────────┼─────────────┼───────────┤ ' + clr('║'),
    clr('║') + ` │ ${prNum} │ ${extnNum} │ ${vstNum} │ ${cdsysNum} │ ${insNum} │ ` + clr('║'),
    clr('║') + ' ╰──────────┴────────────┴───────────┴─────────────┴───────────╯ ' + clr('║'),
    clr('║' + '                                                                 ' + '' + '║'),
    clr('║') + ' See SUSHI-GENERATED-FILES.md for details on generated IG files. ' + clr('║'),
    clr('╠' + '═════════════════════════════════════════════════════════════════' + '' + '╣'),
    clr('║') + ` ${aWittyMessageInvolvingABadFishPun} ${errorNumMsg} ${wrNumMsg} ` + clr('║'),
    clr('╚' + '═════════════════════════════════════════════════════════════════' + '' + '╝')
  ];
  if (!isIG) {
    results.splice(7, 1);
  }
  results.forEach(r => console.log(r));
}

type ResultStatus = 'clean' | 'warnings' | 'errors';

const MESSAGE_MAP: { [key in ResultStatus]: string[] } = {
  clean: [
    'That went swimmingly!',
    'O-fish-ally error free!',
    "Nice! You're totally krilling it!",
    'Cool and So-fish-ticated!',
    'Well hooked and landed!',
    'You earned a PhD in Ichthyology!',
    'You rock, lobster!',
    'Everything is ship-shape!',
    'Ex-clam-ation point!',
    'Ac-clam-ations!'
  ],
  warnings: [
    'Not bad, but you cod do batter!',
    'Something smells fishy...',
    'Warnings... Water those about?',
    'Looks like you are casting about.',
    'A bit pitchy, but tuna-ble.'
  ],
  errors: [
    'Ick! Errors!',
    'Some-fin went wrong...',
    'Unfor-tuna-tely, there are errors.',
    'That really smelt.',
    'You spawned some errors.',
    'Just keep swimming, Dory.',
    'This is the one that got away.',
    'The docs might be bene-fish-al.'
  ]
};

const COLOR_MAP: { [key in ResultStatus]: chalk.Chalk } = {
  clean: chalk.green,
  warnings: chalk.rgb(179, 98, 0),
  errors: chalk.red
};
