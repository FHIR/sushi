#!/usr/bin/env node

import { register } from 'tsconfig-paths';
register({
  baseUrl: __dirname,
  paths: {
    'antlr4/*': ['../node_modules/antlr4/src/antlr4/*']
  }
});

import path from 'path';
import fs from 'fs-extra';
import { Command, OptionValues, Option } from 'commander';
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
  updateExternalDependencies,
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

function logUnexpectedError(e: Error) {
  logger.error(`SUSHI encountered the following unexpected error: ${e.message}`);
  process.exit(1);
}

app().catch(logUnexpectedError);

async function app() {
  const program = new Command()
    .name('sushi')
    .version(getVersion(), '-v, --version', 'print SUSHI version')
    .showHelpAfterError();

  program
    .command('build', { isDefault: true })
    .description('build a SUSHI project')
    .argument('[path-to-fsh-project]')
    .addOption(
      new Option(
        '-l, --log-level <level>',
        'specify the level of log messages (default: "info")'
      ).choices(['error', 'warn', 'info', 'debug'])
    )
    .option('-o, --out <out>', 'the path to the output folder')
    .option('-p, --preprocessed', 'output FSH produced by preprocessing steps')
    .option(
      '-r, --require-latest',
      'exit with error if this is not the latest version of SUSHI',
      false
    )
    .option('-s, --snapshot', 'generate snapshot in Structure Definition output', false)
    .action(async function (projectPath, options) {
      await runBuild(projectPath, options, program.helpInformation()).catch(logUnexpectedError);
    })
    .on('--help', () => {
      console.log('');
      console.log('Additional information:');
      console.log('  [path-to-fsh-project]');
      console.log('    Default: "."');
      console.log('  -o, --out <out>');
      console.log('    Default: "fsh-generated"');
    })
    // NOTE: This option is included give a nice error message when the old init option is used while we support
    // backwards compatibility of the build command.
    .addOption(
      new Option(
        '-i, --init',
        'ERROR: --init option is moved to a separate command. Run: sushi init'
      ).hideHelp()
    )
    .on('option:init', () => {
      // init was moved to a separate command, so log a message to indicate how to use it
      console.log(
        'The --init option has been moved to a separate command. Instead, run the following command: sushi init'
      );
      process.exit(1);
    });

  program
    .command('init')
    .description('initialize a SUSHI project')
    .action(async function () {
      await init().catch(logUnexpectedError);
      process.exit(0);
    });

  program
    .command('update-dependencies')
    .description('update FHIR packages in project configuration')
    .argument('[path-to-fsh-project]')
    .action(async function (projectPath) {
      await runUpdateDependencies(projectPath).catch(logUnexpectedError);
      process.exit(0);
    })
    .on('--help', () => {
      console.log('');
      console.log('Additional information:');
      console.log('  [path-to-fsh-project]');
      console.log('    Default: "."');
    });

  program.parse(process.argv).opts();
}

async function runUpdateDependencies(projectPath: string) {
  const input = ensureInputDir(projectPath);
  const config: Configuration = readConfig(input);
  await updateExternalDependencies(config);
}

async function runBuild(input: string, program: OptionValues, helpText: string) {
  // NOTE: This is included to provide nicer handling for the previous CLI structure for building FSH projects.
  // Check the first argument passed into sushi. If it is not "build", then this is a legacy build,
  // in which case we should make sure that the first argument is a flag or a valid path.
  const arg = process.argv[2];
  if (arg != null && arg !== 'build' && !arg.startsWith('-') && !fs.existsSync(arg)) {
    // It's not a flag or a path, so it's probably a typo of an existing command
    console.log(helpText);
    process.exit(1);
  }

  // Set the log level. If no level is specified, logger defaults to info
  if (program.logLevel != null) {
    // program.logLevel has only valid log levels because the CLI sets the choices
    logger.level = program.logLevel;
  }

  logger.info(`Running ${getVersion()}`);
  logger.info('Arguments:');
  if (program.logLevel) {
    logger.info(`  --log-level ${program.logLevel}`);
  }
  if (program.preprocessed) {
    logger.info('  --preprocessed');
  }
  if (program.snapshot) {
    logger.info('  --snapshot');
  }
  if (program.requireLatest) {
    logger.info('  --require-latest');
  }
  if (program.out) {
    logger.info(`  --out ${path.resolve(program.out)}`);
  }
  logger.info(`  ${path.resolve(input || '.')}`);

  const sushiVersions = await checkSushiVersion();
  if (
    program.requireLatest &&
    (sushiVersions.latest == null || sushiVersions.latest !== sushiVersions.current)
  ) {
    logger.error(
      `Current SUSHI version (${
        sushiVersions.current
      }) is not the latest version. Upgrade to the latest version (${
        sushiVersions.latest ?? 'undetermined'
      }) or run SUSHI again without the --require-latest flag.`
    );
    process.exit(1);
  }

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
    if (
      rawFSH.length === 0 &&
      !(
        fs.existsSync(path.join(originalInput, 'sushi-config.yaml')) ||
        fs.existsSync(path.join(originalInput, 'sushi-config.yml'))
      )
    ) {
      logger.info('No FSH files or sushi-config.yaml present.');
      process.exit(0);
    }
    config = readConfig(originalInput);
    tank = fillTank(rawFSH, config);
  } catch (e) {
    // If no errors have been logged yet, log this exception so the user knows why we're exiting
    if (stats.numError === 0) {
      logger.error(`An unexpected error occurred: ${e.message ?? e}`);
    }
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
  printResults(outPackage, sushiVersions);

  console.log();

  process.exit(stats.numError);
}

function getVersion(): string {
  const sushiVersion = getLocalSushiVersion();
  if (sushiVersion !== null) {
    return `SUSHI v${sushiVersion} (implements FHIR Shorthand specification v${FSH_VERSION})`;
  }
  return 'unknown';
}

function printResults(pkg: Package, sushiVersions: any) {
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

  const { latest, current } = sushiVersions;
  if (latest != null && current != null && latest !== current) {
    const endline = results.pop();
    // prettier-ignore
    results.push(
      clr('╠'  +     '═════════════════════════════════════════════════════════════════'      +     '╣'),
      clr('║') +   pad(`You are using SUSHI version ${current}, but the latest stable`, 65)   + clr('║'),
      clr('║') + pad(`release is version ${latest}. To install the latest release, run:`, 65) + clr('║'),
      clr('║') +                  pad('npm install -g fsh-sushi',65)                          + clr('║'),
      endline
    );
  } else if (latest == null || current == null) {
    const endline = results.pop();
    // prettier-ignore
    results.push(
      clr('╠'  + '═════════════════════════════════════════════════════════════════'    +      '╣'),
      clr('║') + pad('SUSHI cannot determine if it is running the latest version.', 65) +  clr('║'),
      clr('║') + pad('To see a listing of releases, including the latest, visit:', 65)  +  clr('║'),
      clr('║') +          pad('https://github.com/FHIR/sushi/releases', 65)             +  clr('║'),
      endline
    );
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

  // 1. If the user wants the fancy characters, allow them
  if (
    Object.keys(process.env).some(k => k === 'FORCE_FANCY_CHARACTERS') &&
    /(true|1)/i.test(process.env.FORCE_FANCY_CHARACTERS)
  ) {
    return true;
  }
  // 2. Many JVM will insert an environment variable indicating the main Java class being run.
  //      E.g., JAVA_MAIN_CLASS_25538=org.hl7.fhir.igtools.publisher.Publisher
  //    We won't check the actual class; we'll just assume that if it's run in Java, best not take chances.
  if (Object.keys(process.env).some(k => /^JAVA_MAIN_CLASS/.test(k))) {
    return false;
  }
  // 3. It appears that in a Java-launched process, certain aspects of stdout aren't available, so
  //    use that to test if it's likely the fancy chars will be supported.
  if (process.stdout.hasColors === undefined) {
    return false;
  }
  // Otherwise, I guess (?) we're OK.  Worst case scenario: user gets rubbish characters in the summary
  return true;
}
