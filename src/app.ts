#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import chalk from 'chalk';
import { pad, padStart, sample, padEnd } from 'lodash';
import { FSHTank, RawFSH } from './import';
import { exportFHIR, Package } from './export';
import { IGExporter } from './ig';
import { logger, stats, Type } from './utils';
import { loadCustomResources } from './fhirdefs';
import { FHIRDefinitions } from './fhirdefs';
import { Configuration } from './fshtypes';
import {
  ensureInputDir,
  findInputDir,
  ensureOutputDir,
  readConfig,
  loadExternalDependencies,
  fillTank,
  writeFHIRResources,
  getRawFSHes,
  init
} from './utils/Processing';

const FSH_VERSION = '1.0.0';

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
      console.log('    Default: "fsh-generated"');
      console.log(
        '    If legacy publisher mode (fsh subdirectory present), default output is parent of "fsh"'
      );
      console.log(
        '    If legacy flat mode (no input/fsh or fsh subdirectories present), default output is "build"'
      );
    })
    .arguments('[path-to-fsh-defs]')
    .action(function (pathToFshDefs) {
      input = pathToFshDefs;
    })
    .parse(process.argv);

  if (program.init) {
    await init();
    process.exit(0);
  }
  if (program.debug) logger.level = 'debug';
  input = ensureInputDir(input);

  logger.info(`Running ${getVersion()}`);

  logger.info('Arguments:');
  if (program.debug) {
    logger.info('  --debug');
  }
  if (program.snapshot) {
    logger.info('  --snapshot');
  }
  if (program.out) {
    logger.info(`  --out ${path.resolve(program.out)}`);
  }
  logger.info(`  ${path.resolve(input)}`);

  // IG Publisher HACK: the IG Publisher invokes SUSHI with `/fsh` appended (even if it doesn't
  // exist).  If we detect a direct fsh path, we need to fix it by backing up a folder, else it
  // won't correctly detect the IG Publisher mode.
  if (path.basename(input) === 'fsh') {
    input = path.dirname(input);
  }

  const originalInput = input;
  input = findInputDir(input);

  // If an input/fsh subdirectory is used, we are in an IG Publisher context
  const fshFolder = path.basename(input) === 'fsh';
  const inputFshFolder = fshFolder && path.basename(path.dirname(input)) === 'input';
  const isIgPubContext = inputFshFolder;
  // TODO: Legacy support for top level fsh/ subdirectory. Remove when no longer supported.
  const isLegacyIgPubContext = fshFolder && !inputFshFolder;
  const outDir = ensureOutputDir(input, program.out, isIgPubContext, isLegacyIgPubContext);

  let tank: FSHTank;
  let config: Configuration;

  try {
    let rawFSH: RawFSH[];
    if (
      path.basename(path.dirname(input)) === 'input' &&
      path.basename(input) === 'fsh' &&
      !fs.existsSync(input)
    ) {
      // If we have a path that ends with input/fsh but that folder does not exist,
      // we are in a sushi-config.yaml-only case (new tank configuration with no FSH files)
      // so we can safely say there are no FSH files and therefore rawFSH is empty.
      rawFSH = [];
    } else {
      rawFSH = getRawFSHes(input);
    }
    if (
      rawFSH.length === 0 &&
      !fs.existsSync(path.join(originalInput, 'config.yaml')) &&
      !fs.existsSync(path.join(originalInput, 'sushi-config.yaml')) &&
      !fs.existsSync(path.join(originalInput, 'fsh', 'config.yaml')) &&
      !fs.existsSync(path.join(originalInput, 'fsh', 'sushi-config.yaml'))
    ) {
      logger.info('No FSH files or sushi-config.yaml present.');
      process.exit(0);
    }
    config = readConfig(isIgPubContext ? originalInput : input, isLegacyIgPubContext);
    tank = fillTank(rawFSH, config);
  } catch {
    program.outputHelp();
    process.exit(1);
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  const dependencyDefs = loadExternalDependencies(defs, config);

  // Load custom resources
  if (!isIgPubContext) {
    // In legacy configuration (both IG publisher context and any other tank), resources are in ig-data/input/
    loadCustomResources(path.join(input, 'ig-data', 'input'), defs);
  } else {
    // In current tank configuration (input/fsh), resources will be in input/
    loadCustomResources(path.join(input, '..'), defs);
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
  writeFHIRResources(outDir, outPackage, defs, program.snapshot, isIgPubContext);

  // If FSHOnly is true in the config, do not generate IG content, otherwise, generate IG content
  if (config.FSHOnly) {
    logger.info('Exporting FSH definitions only. No IG related content will be exported.');
  } else {
    const igDataPath = isIgPubContext
      ? path.resolve(input, '..', '..')
      : path.resolve(input, 'ig-data');
    logger.info('Assembling Implementation Guide sources...');
    const igExporter = new IGExporter(outPackage, defs, igDataPath, isIgPubContext);
    igExporter.export(outDir);
    logger.info('Assembled Implementation Guide sources; ready for IG Publisher.');
    if (
      !fs
        .readdirSync(outDir)
        .some(file => file.startsWith('_genonce') || file.startsWith('_updatePublisher'))
    ) {
      logger.info(
        'The sample-ig located at https://github.com/FHIR/sample-ig contains scripts useful for downloading and running the IG Publisher.'
      );
    }
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
    'You are dolphinitely doing great!',
    'It doesn’t get any betta than this',
    'You’re piranha roll now!'
  ],
  warnings: [
    'Not bad, but you cod do batter!',
    'Something smells fishy...',
    'Warnings... Water those about?',
    'Looks like you are casting about.',
    'A bit pitchy, but tuna-ble.',
    'Do you sea the problem?',
    'You are skating on fin ice',
    'You should mullet over'
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
    'Documentation may be kelp-ful.',
    'You should do some sole searching.',
    'Call a FSH sturgeon!',
    'This is giving me a haddock.',
    'You whaley need to turn this around'
  ]
};

const COLOR_MAP: { [key in ResultStatus]: chalk.Chalk } = {
  clean: chalk.green,
  warnings: chalk.rgb(179, 98, 0),
  errors: chalk.red
};
