#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import chalk from 'chalk';
import process from 'process';
import { pad, padStart, padEnd } from 'lodash';
import { FSHTank, RawFSH } from './import';
import { exportFHIR, Package } from './export';
import { IGExporter } from './ig';
import { loadCustomResources } from './fhirdefs';
import { FHIRDefinitions } from './fhirdefs';
import { Configuration } from './fshtypes';
import {
  logger,
  stats,
  isSupportedFHIRVersion,
  Type,
  ensureInputDir,
  findInputDir,
  ensureOutputDir,
  readConfig,
  loadExternalDependencies,
  fillTank,
  writeFHIRResources,
  writePreprocessedFSH,
  getRawFSHes,
  init,
  getRandomPun
} from './utils';

const FSH_VERSION = '1.1.0';

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
    .option('-p, --preprocessed', 'output FSH produced by preprocessing steps')
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
  if (program.preprocessed) {
    logger.info('  --preprocessed');
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
  await loadExternalDependencies(defs, config);

  // Load custom resources
  if (!isIgPubContext) {
    // In legacy configuration (both IG publisher context and any other tank), resources are in ig-data/input/
    loadCustomResources(path.join(input, 'ig-data', 'input'), defs);
  } else {
    // In current tank configuration (input/fsh), resources will be in input/
    loadCustomResources(path.join(input, '..'), defs);
  }

  // Check for StructureDefinition
  const structDef = defs.fishForFHIR('StructureDefinition', Type.Resource);
  if (structDef == null || !isSupportedFHIRVersion(structDef.version)) {
    logger.error(
      'Valid StructureDefinition resource not found. The FHIR package in your local cache' +
        ' may be corrupt. Local FHIR cache can be found at <home-directory>/.fhir/packages.' +
        ' For more information, see https://wiki.hl7.org/FHIR_Package_Cache#Location.'
    );
    process.exit(1);
  }

  logger.info('Converting FSH to FHIR resources...');
  const outPackage = exportFHIR(tank, defs);
  writeFHIRResources(outDir, outPackage, defs, program.snapshot, isIgPubContext);

  if (program.preprocessed) {
    logger.info('Writing preprocessed FSH...');
    writePreprocessedFSH(outDir, input, tank);
  }

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

  process.exit(stats.numError);
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
  const lgNum = pad(pkg.logicals.length.toString(), 8);
  const resNum = pad(pkg.resources.length.toString(), 9);
  const vstNum = pad(pkg.valueSets.length.toString(), 9);
  const cdsysNum = pad(pkg.codeSystems.length.toString(), 11);
  const insNum = pad(pkg.instances.length.toString(), 9);
  const errorNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 13);
  const wrNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);

  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(stats.numError, stats.numWarn), 59);
  const clr =
    stats.numError > 0 ? chalk.red : stats.numWarn > 0 ? chalk.rgb(179, 98, 0) : chalk.green;

  // prettier-ignore
  // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
  const results = [
    clr('╔' + '═══════════════════════════════════ SUSHI RESULTS ══════════════════════════════════════' + '' + '╗'),
    clr('║') + ' ╭──────────┬────────────┬──────────┬───────────┬───────────┬─────────────┬───────────╮ ' + clr('║'),
    clr('║') + ' │ Profiles │ Extensions │ Logicals │ Resources │ ValueSets │ CodeSystems │ Instances │ ' + clr('║'),
    clr('║') + ' ├──────────┼────────────┼──────────┼───────────┼───────────┼─────────────┼───────────┤ ' + clr('║'),
    clr('║') + ` │ ${prNum} │ ${extnNum} │ ${lgNum} │ ${resNum} │ ${vstNum} │ ${cdsysNum} │ ${insNum} │ ` + clr('║'),
    clr('║') + ' ╰──────────┴────────────┴──────────┴───────────┴───────────┴─────────────┴───────────╯ ' + clr('║'),
    clr('║' + '                                                                                        ' + '' + '║'),
    clr('╠' + '════════════════════════════════════════════════════════════════════════════════════════' + '' + '╣'),
    clr('║') + ` ${aWittyMessageInvolvingABadFishPun} ${errorNumMsg} ${wrNumMsg} `                        + clr('║'),
    clr('╚' + '════════════════════════════════════════════════════════════════════════════════════════' + '' + '╝')
  ];
  if (!isIG) {
    results.splice(7, 1);
  }

  const convertChars = !supportsFancyCharacters();
  results.forEach(r => {
    if (convertChars) {
      r = r
        .replace(/[╔╝╚╗╠╣═]/g, '=')
        .replace(/[╭╯╰╮]/g, ' ')
        .replace(/[─┬┼┴]/g, '-')
        .replace(/[║│├┤]/g, '|');
    }
    console.log(r);
  });
}

function supportsFancyCharacters(): boolean {
  // There is no sure-fire way, but we know that most problems are when running in the IG Publisher,
  // so try to detect that situation (which is still actually pretty tricky and not guaranteed).

  // 1. Many JVM will insert an environment variable indicating the main Java class being run.
  //      E.g., JAVA_MAIN_CLASS_25538=org.hl7.fhir.igtools.publisher.Publisher
  //    We won't check the actual class; we'll just assume that if it's run in Java, best not take chances.
  if (Object.keys(process.env).some(k => /^JAVA_MAIN_CLASS/.test(k))) {
    return false;
  }
  // 2. It appears that in a Java-launched process, certain aspects of stdout aren't available, so
  //    use that to test if it's likely the fancy chars will be supported.
  if (process.stdout.hasColors === undefined) {
    return false;
  }
  // Otherwise, I guess (?) we're OK.  Worst case scenario: user gets rubbish characters in the summary
  return true;
}
