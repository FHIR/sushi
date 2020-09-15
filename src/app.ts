#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import chalk from 'chalk';
import { pad, padStart, sample, padEnd } from 'lodash';
import { FSHTank } from './import';
import { exportFHIR, Package } from './export';
import { IGExporter } from './ig';
import { logger, stats, Type } from './utils';
import { loadCustomResources } from './fhirdefs';
import { FHIRDefinitions } from './fhirdefs';
import { Configuration } from './fshtypes';
import {
  findInputDir,
  ensureOutputDir,
  readConfig,
  loadExternalDependencies,
  fillTank,
  writeFHIRResources,
  getRawFSHes,
  init
} from './utils/Processing';

const FSH_VERSION = '0.13.x';

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
    .option('-i, --init', 'initialize a SUSHI project')
    .version(getVersion(), '-v, --version', 'print SUSHI version')
    .on('--help', () => {
      console.log('');
      console.log('Additional information:');
      console.log('  [path-to-fsh-defs]');
      console.log('    Default: "."');
      console.log('    If input/fsh/ subdirectory present, it is included in [path-to-fsh-defs]');
      console.log('  -o, --out <out>');
      console.log('    Default: "build"');
      console.log('    If input/fsh/ subdirectory present, default output is to input/generated/');
    })
    .arguments('[path-to-fsh-defs]')
    .action(function (pathToFshDefs) {
      input = pathToFshDefs;
    })
    .parse(process.argv);

  if (program.init) {
    init();
    process.exit(0);
  }
  if (program.debug) logger.level = 'debug';

  logger.info(`Running ${getVersion()}`);

  input = findInputDir(input);

  // If an input/fsh subdirectory is used, we are in an IG Publisher context
  const fshFolder = path.parse(input).base === 'fsh';
  const inputFshFolder = fshFolder && path.parse(input).dir.endsWith(`${path.sep}input`);
  const isIgPubContext = inputFshFolder;
  // TODO: Legacy support for top level fsh/ subdirectory. Remove when no longer supported.
  const isLegacyIgPubContext = fshFolder && !inputFshFolder;
  const outDir = ensureOutputDir(input, program.out, isIgPubContext, isLegacyIgPubContext);

  let config: Configuration;
  try {
    config = readConfig(input);
  } catch {
    process.exit(1);
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  const dependencyDefs = loadExternalDependencies(defs, config);

  // Load custom resources specified in ig-data folder
  loadCustomResources(path.join(input, 'ig-data', 'input'), defs);
  if (isIgPubContext && !fs.existsSync(path.join(input, 'ig-data'))) {
    loadCustomResources(path.join(input, '..', 'input'), defs);
  }

  let tank: FSHTank;
  try {
    const rawFSH = getRawFSHes(input);
    tank = fillTank(rawFSH, config);
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
  const useGeneratedFolder = !isLegacyIgPubContext;
  writeFHIRResources(outDir, outPackage, program.snapshot, useGeneratedFolder);

  // If FSHOnly is true in the config, do not generate IG content, otherwise, generate IG content
  if (config.FSHOnly) {
    logger.info('Exporting FSH definitions only. No IG related content will be exported.');
  } else {
    const igDataPath = path.resolve(input, 'ig-data');
    logger.info('Assembling Implementation Guide sources...');
    const igExporter = new IGExporter(
      outPackage,
      defs,
      igDataPath,
      isIgPubContext || isLegacyIgPubContext
    );
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
    const sushiVersion = fs.readJSONSync(packageJSONPath)?.version;
    return `SUSHI v${sushiVersion} (implements FHIR Shorthand specification v${FSH_VERSION})`;
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
    'Fin-tastic job!',
    "You're dolphinitely doing great!"
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
    'Something went eely wrong there.',
    'Documentation may be kelp-ful.'
  ]
};

const COLOR_MAP: { [key in ResultStatus]: chalk.Chalk } = {
  clean: chalk.green,
  warnings: chalk.rgb(179, 98, 0),
  errors: chalk.red
};
