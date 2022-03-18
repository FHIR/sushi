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
  getRandomPun,
  setIgnoredWarnings,
  getLocalSushiVersion,
  checkSushiVersion
} from './utils';

const FSH_VERSION = '2.0.0';

app().catch(e => {
  logger.error(`SUSHI encountered the following unexpected error: ${e.message}`);
  process.exit(1);
});

async function app() {
  let input: string;

  program
    .name('sushi')
    .usage('[path-to-fsh-project] [options]')
    .option('-o, --out <out>', 'the path to the output folder')
    .option('-d, --debug', 'output extra debugging information')
    .option('-p, --preprocessed', 'output FSH produced by preprocessing steps')
    .option('-s, --snapshot', 'generate snapshot in Structure Definition output', false)
    .option('-i, --init', 'initialize a SUSHI project')
    .version(getVersion(), '-v, --version', 'print SUSHI version')
    .on('--help', () => {
      console.log('');
      console.log('Additional information:');
      console.log('  [path-to-fsh-project]');
      console.log('    Default: "."');
      console.log('  -o, --out <out>');
      console.log('    Default: "fsh-generated"');
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

  const rootIgnoreWarningsPath = path.join(input, 'sushi-ignoreWarnings.txt');
  const nestedIgnoreWarningsPath = path.join(input, 'input', 'sushi-ignoreWarnings.txt');
  if (fs.existsSync(rootIgnoreWarningsPath)) {
    setIgnoredWarnings(fs.readFileSync(rootIgnoreWarningsPath, 'utf-8'));
    if (fs.existsSync(nestedIgnoreWarningsPath)) {
      logger.warn(
        'Found sushi-ignoreWarnings.txt files in the following locations:\n\n' +
          ` - ${rootIgnoreWarningsPath}\n` +
          ` - ${nestedIgnoreWarningsPath}\n\n` +
          `Only the file at ${rootIgnoreWarningsPath} will be processed. ` +
          'Remove one of these files to avoid this warning.'
      );
    }
  } else if (fs.existsSync(nestedIgnoreWarningsPath)) {
    setIgnoredWarnings(fs.readFileSync(nestedIgnoreWarningsPath, 'utf-8'));
  }

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

  const originalInput = input;
  input = findInputDir(input);

  // If an input/fsh subdirectory is used, we are in an IG Publisher context
  const fshFolder = path.basename(input) === 'fsh';
  const inputFshFolder = fshFolder && path.basename(path.dirname(input)) === 'input';
  if (!inputFshFolder) {
    // Since current supported tank configuration requires input/fsh folder,
    // both legacy IG publisher mode and legacy flat tank cases occur when
    // there is no input/fsh/ folder.
    // If we detect this case, things are about to go very wrong, so exit immediately.
    logger.error(
      'Migration to current SUSHI project structure is required. See above error message for details. Exiting.'
    );
    process.exit(1);
  }
  const outDir = ensureOutputDir(input, program.out);

  let tank: FSHTank;
  let config: Configuration;

  try {
    let rawFSH: RawFSH[];
    if (!fs.existsSync(input)) {
      // If we have a path that ends with input/fsh but that folder does not exist,
      // we are in a sushi-config.yaml-only case (current tank configuration with no FSH files)
      // so we can safely say there are no FSH files and therefore rawFSH is empty.
      rawFSH = [];
    } else {
      rawFSH = getRawFSHes(input);
    }
    if (rawFSH.length === 0 && !fs.existsSync(path.join(originalInput, 'sushi-config.yaml'))) {
      logger.info('No FSH files or sushi-config.yaml present.');
      process.exit(0);
    }
    config = readConfig(originalInput);
    tank = fillTank(rawFSH, config);
  } catch {
    program.outputHelp();
    process.exit(1);
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  await loadExternalDependencies(defs, config);

  // Load custom resources. In current tank configuration (input/fsh), resources will be in input/
  loadCustomResources(path.join(input, '..'), originalInput, config.parameters, defs);

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
  writeFHIRResources(outDir, outPackage, defs, program.snapshot);

  if (program.preprocessed) {
    logger.info('Writing preprocessed FSH...');
    writePreprocessedFSH(outDir, input, tank);
  }

  // If FSHOnly is true in the config, do not generate IG content, otherwise, generate IG content
  if (config.FSHOnly) {
    logger.info('Exporting FSH definitions only. No IG related content will be exported.');
  } else {
    const igFilesPath = path.resolve(input, '..', '..');
    logger.info('Assembling Implementation Guide sources...');
    const igExporter = new IGExporter(outPackage, defs, igFilesPath);
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
  const sushiVersions = await checkSushiVersion();
  printResults(outPackage, sushiVersions);

  console.log();

  process.exit(stats.numError);
}

function getVersion(): string {
  const sushiVersion = getLocalSushiVersion();
  if (sushiVersion !== 'unknown') {
    return `SUSHI v${sushiVersion} (implements FHIR Shorthand specification v${FSH_VERSION})`;
  }
  return 'unknown';
}

function printResults(pkg: Package, sushiVersions: any) {
  const { latest, current } = sushiVersions;
  // NOTE: These variables are creatively names to align well in the strings below while keeping prettier happy
  const profileNum = pad(pkg.profiles.length.toString(), 13);
  const extentNum = pad(pkg.extensions.length.toString(), 12);
  const logiclNum = pad(pkg.logicals.length.toString(), 12);
  const resourcNum = pad(pkg.resources.length.toString(), 13);
  const valueSetsNumber = pad(pkg.valueSets.length.toString(), 18);
  const codeSystemsNum = pad(pkg.codeSystems.length.toString(), 17);
  const instancesNumber = pad(pkg.instances.length.toString(), 18);
  const errorNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 13);
  const wrNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);

  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(stats.numError, stats.numWarn), 36);
  const clr =
    stats.numError > 0 ? chalk.red : stats.numWarn > 0 ? chalk.rgb(179, 98, 0) : chalk.green;

  // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
  const results = [
    clr('╔' + '════════════════════════ SUSHI RESULTS ══════════════════════════' + '' + '╗'),
    clr('║') + ' ╭───────────────┬──────────────┬──────────────┬───────────────╮ ' + clr('║'),
    clr('║') + ' │    Profiles   │  Extensions  │   Logicals   │   Resources   │ ' + clr('║'),
    clr('║') + ' ├───────────────┼──────────────┼──────────────┼───────────────┤ ' + clr('║'),
    clr('║') + ` │ ${profileNum} │ ${extentNum} │ ${logiclNum} │ ${resourcNum} │ ` + clr('║'),
    clr('║') + ' ╰───────────────┴──────────────┴──────────────┴───────────────╯ ' + clr('║'),
    clr('║') + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + clr('║'),
    clr('║') + ' │      ValueSets     │    CodeSystems    │     Instances      │ ' + clr('║'),
    clr('║') + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + clr('║'),
    clr('║') + ` │ ${valueSetsNumber} │ ${codeSystemsNum} │ ${instancesNumber} │ ` + clr('║'),
    clr('║') + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + clr('║'),
    clr('║' + '                                                                 ' + '' + '║'),
    clr('╠' + '═════════════════════════════════════════════════════════════════' + '' + '╣'),
    clr('║') + ` ${aWittyMessageInvolvingABadFishPun} ${errorNumMsg} ${wrNumMsg} ` + clr('║'),
    clr('╚' + '═════════════════════════════════════════════════════════════════' + '' + '╝')
  ];

  if (latest != null && current !== 'unknown' && latest !== current) {
    const endline = results.pop();
    // prettier-ignore
    results.push(
      clr('╠' + '═════════════════════════════════════════════════════════════════' + '' + '╣'),
      clr('║') + `    You are using SUSHI version ${current}, but the latest stable     ` + '' + clr('║'),
      clr('║') + `  release is version ${latest}. To install the latest release, run:  ` + '' + clr('║'),
      clr('║') + '                  npm install -g fsh-sushi                       ' + '' + clr('║'),
      endline
    )
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
