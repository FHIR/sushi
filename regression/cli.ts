/* eslint-disable @typescript-eslint/no-non-null-assertion */
import path from 'path';
import fs from 'fs-extra';
import readlineSync from 'readline-sync';
import { Command } from 'commander';
import { Config, RegressionData, Repo, run, logOptions } from './run';
import { findReposUsingFSHFinder, findReposUsingLegacyApproach } from './find';

main().catch(err => {
  console.error('Unexpected error: ', err);
});

async function main() {
  const program = new Command().name('regression').showHelpAfterError();

  program
    .command('run', { isDefault: true })
    .description('Find differences in FSH project outputs from one version of SUSHI to another')
    .option(
      '-a, --a <version>',
      'Baseline version of SUSHI. Can be an NPM version number or tag, "gh:branch" to use a GitHub branch, or "local" to use the local code with ts-node.',
      'gh:master'
    )
    .option(
      '-b, --b <version>',
      'Version of SUSHI under test. Can be an NPM version number or tag, "gh:branch" to use a GitHub branch, or "local" to use the local code with ts-node.',
      'local'
    )
    .option(
      '-l, --lookback <days>',
      'The number of days to lookback in FSHFinder repositories (based on last updated date).'
    )
    .option(
      '-c, --count <number>',
      'The maximum number of FSHFinder repositories to test (most recent first).'
    )
    .option(
      '-r, --repo <repos...>',
      'One or more repos to test, each specified as a Github {org}/{repo}#{branch} (e.g., HL7/fhir-mCODE-ig#master). This option is not compatible with the lookback, count, or file options.'
    )
    .option(
      '-f, --file <file>',
      'A text file for which each line is a GitHub {org}/{repo}#{branch} to test (e.g., HL7/fhir-mCODE-ig#master). This is mostly used for legacy purposes and is not compatible with the lookback, count, or repo arguments.'
    )
    .option(
      '-o, --output <folder>',
      'The folder to write regression data to',
      path.relative(process.cwd(), path.join(__dirname, 'output'))
    )
    .action(runAction);

  program
    .command('list')
    .description('List repositories found using FSH Finder')
    .option('-c, --count <number>', 'number of repositories to show')
    .option('-l, --lookback <days>', 'lookback period in days')
    .action(listAction);

  program
    .command('list-legacy')
    .description(
      'List current repos-all.txt or repos-select.txt file contents without updating them'
    )
    .option('--select')
    .action(listLegacyAction);

  program
    .command('update-legacy')
    .description('Update repos-all.txt using the legacy repository finder logic')
    .action(updateLegacyAction);

  return program.parseAsync(process.argv);
}

async function runAction(options: any) {
  const config = new Config();
  config.output = path.isAbsolute(options.output)
    ? path.normalize(options.output)
    : path.normalize(path.join(process.cwd(), options.output));
  config.dataFile = path.join(config.output, 'data.json');

  let dataJSON: RegressionData | null = null;
  if (fs.existsSync(config.dataFile)) {
    dataJSON = await fs.readJSON(config.dataFile);
  }

  const doContinue = (() => {
    if (dataJSON && !dataJSON.done) {
      console.log('Found data file for incomplete regression with:');
      logOptions(dataJSON.config);
      console.log();
      return readlineSync.keyInYNStrict('Would you like to continue that regression?');
    }
    return false;
  })();
  console.log();

  if (doContinue) {
    config.version1 = dataJSON!.config.version1;
    config.version2 = dataJSON!.config.version2;
    config.repoOptions = dataJSON!.config.repoOptions;
    config.continued = true;
  } else {
    config.version1 = options.a;
    config.version2 = options.b;
    if (options.lookback != null) {
      if (options.repo || options.file) {
        console.error(
          `The --lookback option cannot be used with the ${
            options.repo ? '--repo' : '--file'
          } option.`
        );
        process.exit(1);
      }
      config.repoOptions.lookback = parseInt(options.lookback);
    }
    if (options.count != null) {
      if (options.repo || options.file) {
        console.error(
          `The --count option cannot be used with the ${options.repo ? '--repo' : '--file'} option.`
        );
        process.exit(1);
      }
      config.repoOptions.count = parseInt(options.count);
    }
    if (options.repo) {
      if (options.file) {
        console.error('The --repo option cannot be used with the --file option.');
        process.exit(1);
      }
      config.repoOptions.repos = options.repo;
    }
    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(`The specified file does not exist: ${options.file}`);
      }
      config.repoOptions.file = options.file;
    }
    config.continued = false;
  }
  const data = new RegressionData(config);
  if (doContinue) {
    dataJSON!.repos.forEach(r => {
      const repo = new Repo(r.name, r.branch);
      repo.changed = r.changed;
      repo.error = r.error;
      repo.sushiStats1 = r.sushiStats1;
      repo.sushiStats2 = r.sushiStats2;
      data.repos.push(repo);
    });
  }

  return run(config, data);
}

async function listAction(options: any) {
  const optionsObj: { count?: number; lookback?: number } = {};
  if (options.count != null) {
    optionsObj.count = parseInt(options.count);
  }
  if (options.lookback != null) {
    optionsObj.lookback = parseInt(options.lookback);
  }
  console.log(await findReposUsingFSHFinder(optionsObj));
}

async function listLegacyAction(options: any) {
  const filename = options.select ? 'repos-select.txt' : 'repos-all.txt';
  const repoFilePath = path.join(__dirname, filename);
  console.log(await fs.readFile(repoFilePath, 'utf8'));
}

async function updateLegacyAction() {
  const repoFilePath = path.join(__dirname, 'repos-all.txt');
  const repoList = await findReposUsingLegacyApproach(fs.readFileSync(repoFilePath, 'utf8'));
  fs.writeFileSync(repoFilePath, repoList, 'utf8');
}
