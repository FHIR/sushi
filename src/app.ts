#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import { FSHTank, importConfiguration } from './import';
import { exportFHIR, Package } from './export';
import { IGExporter } from './ig';
import { logger, stats, Type } from './utils';
import { loadCustomResources } from './fhirdefs';
import { FHIRDefinitions } from './fhirdefs';
import {
  findInputDir,
  ensureOutputDir,
  readConfig,
  loadExternalDependencies,
  fillTank,
  writeFHIRResources,
  getRawFSHes,
  getIgDataPath
} from './utils/Processing';
import { pad, padStart, sample, padEnd } from 'lodash';
import chalk from 'chalk';
import { Configuration } from './fshtypes';
import { ensureConfiguration } from './import/ensureConfiguration';

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

  input = findInputDir(input);

  // If a fsh subdirectory is used, we are in an IG Publisher context
  const isIgPubContext = path.parse(input).base === 'fsh';
  const outDir = ensureOutputDir(input, program.out, isIgPubContext);

  let config: any;
  try {
    config = readConfig(input);
  } catch {
    process.exit(1);
  }

  // Get the config.yaml (or create it if possible)
  const configPath = ensureConfiguration(input);
  if (configPath == null || !fs.existsSync(configPath)) {
    logger.error('No config.yaml in FSH definition folder.');
    process.exit(1);
  }
  const configYaml = fs.readFileSync(configPath, 'utf8');
  let yamlConfig: Configuration;
  try {
    yamlConfig = importConfiguration(configYaml, configPath);
  } catch (e) {
    process.exit(1);
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  const dependencyDefs = loadExternalDependencies(defs, yamlConfig);

  // Load custom resources specified in ig-data folder
  loadCustomResources(input, defs);

  let tank: FSHTank;
  try {
    const rawFSH = getRawFSHes(input);
    tank = fillTank(rawFSH, config, yamlConfig);
  } catch {
    program.outputHelp();
    process.exit(1);
  }
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
  writeFHIRResources(outDir, outPackage, program.snapshot);

  // If igDataPath exists, generate an IG, otherwise, generate resources only
  let isIG = false;
  const igDataPath = getIgDataPath(input);
  if (igDataPath) {
    isIG = true;
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
    'Ac-clam-ations!',
    'Fin-tastic job!'
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
    'The docs might be bene-fish-al.',
    'This was a turtle disaster.',
    'Something went eely wrong there.'
  ]
};

const COLOR_MAP: { [key in ResultStatus]: chalk.Chalk } = {
  clean: chalk.green,
  warnings: chalk.rgb(179, 98, 0),
  errors: chalk.red
};
