import path from 'path';
import util from 'util';
import temp from 'temp';
import os from 'os';
import { execFile } from 'child_process';
import fs from 'fs-extra';
import axios from 'axios';
import readlineSync from 'readline-sync';
import extract from 'extract-zip';
import opener from 'opener';
import { isEqual, mean, union } from 'lodash';
import { createTwoFilesPatch } from 'diff';
import { diffString } from 'json-diff';
import chalk from 'chalk';
import { FHIRDefinitions, createFHIRDefinitions } from '../src/fhirdefs/FHIRDefinitions';
import { findReposUsingFSHFinder } from './find';
import {
  loadExternalDependencies,
  readConfig,
  restoreMainLogger,
  switchToSecretLogger
} from '../src/utils';
import { DiskBasedPackageCache } from 'fhir-package-loader';

// Track temporary files so they are deleted when the process exits
temp.track();

export class Config {
  version1: string;
  version2: string;
  repoOptions: {
    count?: number;
    lookback?: number;
    repos?: string[];
    file?: string;
  };
  disablePrecaching: boolean;
  output: string;
  dataFile: string;
  continued: boolean;
  private tempFolder: string;

  constructor() {
    this.repoOptions = {};
    this.tempFolder = temp.mkdirSync('sushi-regression');
  }

  getVersion(versionNum: 1 | 2): string {
    switch (versionNum) {
      case 1:
        return this.version1;
      case 2:
        return this.version2;
    }
  }

  getSUSHIDir(num: 1 | 2): string {
    const version = this.getVersion(num);
    if (version === 'local') {
      return path.resolve(__dirname, '..');
    } else {
      return path.join(this.tempFolder, `sushi-${this.sanitize(version)}`);
    }
  }

  getSUSHIExecFile(num: 1 | 2): string {
    const version = this.getVersion(num);
    if (version === 'local' || /^(gh|github):/.test(version)) {
      return 'node';
    } else {
      return `${path.join(this.getSUSHIDir(num), 'node_modules', '.bin', 'sushi')}`;
    }
  }

  getSUSHIExecArgs(num: 1 | 2): string[] {
    const version = this.getVersion(num);
    if (version === 'local' || /^(gh|github):/.test(version)) {
      return [`${path.join(this.getSUSHIDir(num), 'dist', 'app.js')}`, '.'];
    } else {
      return ['.'];
    }
  }

  getRepoDir(repo: Repo): string {
    return path.join(this.output, `${this.sanitize(repo.name)}-${this.sanitize(repo.branch)}`);
  }

  getRepoSUSHIDir(repo: Repo, num: 1 | 2): string {
    const version = this.getVersion(num);
    return path.join(this.getRepoDir(repo), `sushi-${this.sanitize(version)}`);
  }

  getRepoSUSHILogFile(repo: Repo, num: 1 | 2): string {
    return `${this.getRepoSUSHIDir(repo, num)}.log`;
  }

  getRepoZipFile(repo: Repo): string {
    return path.join(
      this.getRepoDir(repo),
      `${this.sanitize(repo.name)}-${this.sanitize(repo.branch)}.zip`
    );
  }

  getRepoDiff(repo: Repo): string {
    return path.join(
      this.getRepoDir(repo),
      `${this.sanitize(repo.name)}-${this.sanitize(repo.branch)}.diff`
    );
  }

  getRepoDiffReport(repo: Repo): string {
    return `${this.getRepoDiff(repo)}.html`;
  }

  getRepoJsonDiffReport(repo: Repo): string {
    return `${this.getRepoDiff(repo)}json.html`;
  }

  getOverallDiffReport(): string {
    return path.join(this.output, 'index.html');
  }

  private sanitize(input: string): string {
    // Replace most symbols with '-', but don't allow '-' as first character
    return input.replace(/[^A-Za-z0-9_.\-]+/g, '-').replace(/^-+/, '');
  }
}

class RunStats {
  public warnings?: number;
  public elapsed?: number;

  constructor(public errors: number) {}

  get elapsedSeconds() {
    if (this.elapsed != null) {
      return Math.round(this.elapsed / 1000);
    }
  }
}

class SummaryStats {
  constructor(
    private repos: Repo[],
    private elapsedTime: number
  ) {}

  get totalRepos() {
    return this.repos.length;
  }

  get reposWithDiffErrors() {
    return this.repos.filter(r => r.sushiStats1.errors != r.sushiStats2.errors).length;
  }

  get reposWithDiffWarnings() {
    return this.repos.filter(r => r.sushiStats1.warnings != r.sushiStats2.warnings).length;
  }

  get reposWithDiffOutput() {
    return this.repos.filter(r => r.changed).length;
  }

  get reposWithSlowerTime() {
    return this.repos.filter(r => r.getTimeDeltaPercentage() > 0).length;
  }

  get reposWithFasterTime() {
    return this.repos.filter(r => r.getTimeDeltaPercentage() < 0).length;
  }

  get avgTimeDeltaPercentage() {
    return roundAwayFromZero(mean(this.repos.map(r => r.getTimeDeltaPercentage())));
  }

  get avgTimeSlowerPercentage() {
    return roundAwayFromZero(
      mean(this.repos.map(r => r.getTimeDeltaPercentage()).filter(t => t > 0))
    );
  }

  get avgTimeFasterPercentage() {
    return roundAwayFromZero(
      mean(this.repos.map(r => r.getTimeDeltaPercentage()).filter(t => t < 0))
    );
  }

  get totalTime() {
    return this.elapsedTime;
  }
}

export class Repo {
  public changed: boolean;
  public error: boolean;
  public sushiStats1: RunStats;
  public sushiStats2: RunStats;

  constructor(
    public name: string,
    public branch: string
  ) {}

  getTimeDeltaSeconds() {
    const [time1, time2] = [
      this.sushiStats1.elapsedSeconds ?? 0,
      this.sushiStats2.elapsedSeconds ?? 0
    ];
    if (time1 === 0 || time2 === 0) {
      // probably invalid, so just return 0
      return 0;
    }
    return time2 - time1;
  }

  getTimeDeltaPercentage() {
    const [time1, time2] = [this.sushiStats1.elapsed ?? 0, this.sushiStats2.elapsed ?? 0];
    if (time1 === 0 || time2 === 0) {
      // probably invalid, so just return 0
      return 0;
    }
    // Round away from zero to whole percentage
    return roundAwayFromZero((time2 / time1 - 1) * 100);
  }

  getDownloadURL() {
    return `https://github.com/${this.name}/archive/${this.branch}.zip`;
  }
}

export class RegressionData {
  repos: Repo[] = [];
  done = false;
  constructor(public config: Config) {}
}

export async function run(config: Config, data: RegressionData) {
  console.log(`${config.continued ? 'Continuing' : 'Running'} SUSHI regression with`);
  logOptions(config);
  console.log();

  const start = new Date();
  if (!config.continued) {
    await prepareOutputFolder(config);
    await exportRepoList(config);
  }
  await fs.writeJSON(config.dataFile, data, { spaces: 2 });
  const htmlTemplate = await fs.readFile(path.join(__dirname, 'template.html'), 'utf8');
  const jsonTemplate = await fs.readFile(path.join(__dirname, 'jsontemplate.html'), 'utf8');
  await Promise.all([setupSUSHI(1, config), setupSUSHI(2, config)]);
  let packageCacher: FHIRDefinitions | undefined;
  if (!config.disablePrecaching) {
    packageCacher = await getPackageCacher();
  }
  const repos = await getRepoList(config);
  // Iterate repos synchronously since running more than one SUSHI in parallel might cause
  // issues w/ .fhir cache management. We *could* do the downloads and extractions and
  // reporting in parallel, but it's not clear if many efficiencies would be gained.
  let i = 1;
  for (const repo of repos) {
    if (config.continued) {
      const previous = data.repos.find(
        r => r.name === repo.name && r.branch === repo.branch && !r.error
      );
      if (previous) {
        repo.changed = previous.changed;
        repo.error = previous.error;
        repo.sushiStats1 = previous.sushiStats1;
        repo.sushiStats2 = previous.sushiStats2;
        console.log();
        console.log(
          `Skipping ${repo.name}#${repo.branch} (${i++} of ${
            repos.length
          }) - previously processed w/ result: ${repo.changed ? 'CHANGED' : 'SAME'}`
        );
        continue;
      }
    }
    console.log();
    console.log(`Processing ${repo.name}#${repo.branch} (${i++} of ${repos.length})`);
    try {
      await downloadAndExtractRepo(repo, config);
    } catch (e) {
      console.log(
        chalk.redBright(`Regression aborted for ${repo.name}#${repo.branch}: ${e.message}`)
      );
      repo.error = true;
      continue;
    }
    if (packageCacher) {
      await precacheDependencies(repo, config, packageCacher);
    }
    // We should only run SUSHI one at a time due to its asynch management of the .fhir cache
    repo.sushiStats1 = await runSUSHI(1, repo, config);
    repo.sushiStats2 = await runSUSHI(2, repo, config);
    await generateDiff(repo, config, htmlTemplate, jsonTemplate);
    data.repos.push(repo);
    await fs.writeJSON(config.dataFile, data, { spaces: 2 });
  }
  const elapsed = Math.ceil((new Date().getTime() - start.getTime()) / 1000);
  await createReport(repos, elapsed, config);
  data.done = true;
  await fs.writeJSON(config.dataFile, data, { spaces: 2 });
  console.log(`Total time: ${elapsed} seconds`);
}

export function getOptionStrings(config: Config) {
  const options = [`--a ${config.version1}`, `--b ${config.version2}`];
  if (config.repoOptions.lookback != null) {
    options.push(`--lookback ${config.repoOptions.lookback}`);
  }
  if (config.repoOptions.count != null) {
    options.push(`--count ${config.repoOptions.count}`);
  }
  if (config.repoOptions.repos != null) {
    options.push(`--repo ${config.repoOptions.repos.join(' ')}`);
  }
  if (config.repoOptions.file != null) {
    options.push(`--file ${config.repoOptions.file}`);
  }
  options.push(`--out ${config.output}`);
  if (config.disablePrecaching) {
    options.push('--disableDependencyPrecaching');
  }
  return options;
}

export function logOptions(config: Config) {
  getOptionStrings(config).forEach(o => console.log(`  ${o}`));
}

async function prepareOutputFolder(config: Config): Promise<void> {
  if (await fs.pathExists(config.output)) {
    const doDelete = readlineSync.keyInYN(
      'The specified output folder already exists. Do you wish to delete it?'
    );
    console.log();
    if (doDelete) {
      await fs.emptyDir(config.output);
    } else {
      console.log('Cannot run regression using an existing output folder.  Exiting.');
      process.exit(1);
    }
  } else {
    await fs.mkdirp(config.output);
  }
}

async function exportRepoList(config: Config): Promise<void> {
  const outputRepoFile = path.join(config.output, 'repos.txt');
  if (config.repoOptions.file) {
    return fs.copyFile(config.repoOptions.file, outputRepoFile);
  } else if (config.repoOptions.repos) {
    return fs.writeFile(outputRepoFile, config.repoOptions.repos.join(os.EOL), 'utf8');
  } else {
    const optionsObj: { count?: number; lookback?: number } = {};
    if (config.repoOptions.lookback != null) {
      optionsObj.lookback = config.repoOptions.lookback;
    }
    if (config.repoOptions.count != null) {
      optionsObj.count = config.repoOptions.count;
    }
    const repoList = await findReposUsingFSHFinder(optionsObj);
    return fs.writeFile(outputRepoFile, repoList, 'utf8');
  }
}

async function setupSUSHI(num: 1 | 2, config: Config) {
  const version = config.getVersion(num);
  const sushiDir = config.getSUSHIDir(num);
  if (version === 'local') {
    console.log(`Installing local sushi at ${sushiDir}`);
    await util.promisify(execFile)('npm', ['install'], { cwd: sushiDir, shell: true });
  } else if (/^(gh|github):/.test(version)) {
    const branch = version.replace(/^(gh|github):/, '');
    console.log(`Installing sushi#${branch} from GitHub`);
    // NOTE: Windows does not support "npm install https://github.com/..." well, so we download
    // and install the zip distribution instead. In order to get the folder format we want, we
    // extract in a different temp folder first and then move the extracted root folder to where
    // we really want it.
    const tempSushiDir = `${sushiDir}-temp`;
    await fs.mkdirp(tempSushiDir);
    const zipPath = path.join(tempSushiDir, 'sushi.zip');
    const ghRepo = new Repo('FHIR/sushi', branch);
    await downloadAndExtractZip(ghRepo.getDownloadURL(), zipPath, tempSushiDir);
    const zipRootFolderName = await (await fs.readdir(tempSushiDir)).find(name => /\w/.test(name));
    const zipRoot = path.join(tempSushiDir, zipRootFolderName ?? '');
    await fs.move(zipRoot, sushiDir);
    await util.promisify(execFile)('npm', ['install'], { cwd: sushiDir, shell: true });
  } else {
    console.log(`Installing fsh-sushi@${version} from NPM`);
    await fs.mkdirp(sushiDir);
    await util.promisify(execFile)('npm', ['install', `fsh-sushi@${version}`], {
      cwd: sushiDir,
      shell: true
    });
  }
}

async function getRepoList(config: Config): Promise<Repo[]> {
  const contents = await fs.readFile(path.join(config.output, 'repos.txt'), 'utf8');
  const lines = contents
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && line[0] !== '#');
  const repos: Repo[] = [];
  lines.forEach(line => {
    const parts = line.split(/#/, 2);
    if (parts.length !== 2 || !parts[0].match(/^.+\/.+$/)) {
      console.error(
        `Skipping invalid line: "${line}". Repos must be listed using format "userOrOrg/repoName#branchName"`
      );
      return;
    }
    repos.push(new Repo(parts[0].trim(), parts[1].trim()));
  });
  return repos;
}

async function downloadAndExtractRepo(repo: Repo, config: Config) {
  const repoOutput = config.getRepoDir(repo);
  if (config.continued && (await fs.pathExists(repoOutput))) {
    console.log('  - Removing existing repo folder from previous incomplete regression');
    await fs.remove(repoOutput);
  }
  await fs.mkdirp(repoOutput);
  console.log(`  - Downloading ${repo.getDownloadURL()}`);
  await downloadZip(repo.getDownloadURL(), config.getRepoZipFile(repo));
  // Extract the zip twice. This seems to be more reliable than extract and copy
  for (const dest of [config.getRepoSUSHIDir(repo, 1), config.getRepoSUSHIDir(repo, 2)]) {
    const tempDir = temp.mkdirSync('sushi-regression-repo');
    await fs.mkdirp(tempDir);
    await extract(config.getRepoZipFile(repo), { dir: tempDir });
    const zipRootFolderName = await (await fs.readdir(tempDir)).find(name => /\w/.test(name));
    const zipRoot = path.join(tempDir, zipRootFolderName ?? '');
    await fs.move(zipRoot, dest);
  }
  await fs.unlink(config.getRepoZipFile(repo));
}

async function downloadAndExtractZip(zipURL: string, zipPath: string, extractTo: string) {
  await downloadZip(zipURL, zipPath);
  await extract(zipPath, { dir: extractTo });
  await fs.unlink(zipPath);
}

async function downloadZip(zipURL: string, zipPath: string) {
  return axios({
    method: 'get',
    url: zipURL,
    responseType: 'stream'
  }).then(response => {
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);
    return new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  });
}

// A special FHIRDefinitions that downloads and caches packages but doesn't register resources
async function getPackageCacher(isSupplemental = false): Promise<FHIRDefinitions> {
  const defs = await createFHIRDefinitions(isSupplemental, async () => getPackageCacher(true), {
    packageCache: new (class PackageCacheForRegression extends DiskBasedPackageCache {
      constructor() {
        super(path.join(os.homedir(), '.fhir', 'packages'));
      }

      // Override getPotentialResourcePaths to avoid registering all the resources
      getPotentialResourcePaths(): string[] {
        return [];
      }
    })()
  });
  return defs;
}

async function precacheDependencies(repo: Repo, config: Config, packageCacher: FHIRDefinitions) {
  process.stdout.write('  - Precaching IG dependencies');
  // suppress logging so we don't see all the package logging
  const loggerData = switchToSecretLogger();
  try {
    const sushiConfig = readConfig(config.getRepoSUSHIDir(repo, 1));
    if (sushiConfig) {
      await loadExternalDependencies(packageCacher, sushiConfig);
    }
  } catch {
    process.stdout.write(' (precache failed)');
  } finally {
    restoreMainLogger(loggerData);
    process.stdout.write('\n');
  }
}

async function runSUSHI(num: 1 | 2, repo: Repo, config: Config): Promise<RunStats> {
  const version = config.getVersion(num);
  const repoSUSHIDir = config.getRepoSUSHIDir(repo, num);
  console.log(`  - Running SUSHI ${version}`);
  const startTime = new Date();
  let result: { stdout: string; stderr: string; code?: number };
  try {
    result = await util.promisify(execFile)(
      config.getSUSHIExecFile(num),
      config.getSUSHIExecArgs(num),
      {
        cwd: repoSUSHIDir,
        shell: true
      }
    );
  } catch (err) {
    result = err;
  }

  const stats = new RunStats(result.code ?? 0);
  stats.elapsed = new Date().getTime() - startTime.getTime();
  const match = /^[║|]\s+.*\s+(\d+)\s+Errors?\s+(\d+)\s+Warnings?\s+[║|]$/m.exec(result.stdout);
  if (match) {
    const [errors, warnings] = match.slice(1, 3).map(m => Number.parseInt(m));
    // Only trust the scraped numbers if the error numbers match up
    if (errors === stats.errors) {
      stats.warnings = warnings;
    }
  }

  let out = '==================================== STDOUT ====================================\n';
  out += result.stdout || '<empty>';
  out += '\n\n';
  out += '==================================== STDERR ====================================\n';
  out += result.stderr || '<empty>';
  await fs.writeFile(`${repoSUSHIDir}.log`, out, 'utf8');

  return stats;
}

async function generateDiff(
  repo: Repo,
  config: Config,
  htmlTemplate: string,
  jsonTemplate: string
): Promise<void> {
  process.stdout.write('  - Comparing output ');
  try {
    const repoSUSHIDir1 = config.getRepoSUSHIDir(repo, 1);
    const repoSUSHIDir2 = config.getRepoSUSHIDir(repo, 2);
    const [v1Files, v2Files] = await Promise.all([
      getFilesRecursive(repoSUSHIDir1),
      getFilesRecursive(repoSUSHIDir2)
    ]);
    const files = union(
      v1Files.map(f => path.relative(repoSUSHIDir1, f)),
      v2Files.map(f => path.relative(repoSUSHIDir2, f))
    );
    files.sort();
    let jsonResults = '';
    //Don't use forEach because it can result in files out-of-order due to async
    for (const file of files) {
      const v1File = path.join(repoSUSHIDir1, file);
      const v2File = path.join(repoSUSHIDir2, file);
      const [v1Contents, v2Contents] = await Promise.all([readFile(v1File), readFile(v2File)]);
      let v1Json: any = null;
      let v2Json: any = null;
      try {
        v1Json = JSON.parse(v1Contents);
        v2Json = JSON.parse(v2Contents);
        if (isEqual(v1Json, v2Json)) {
          continue;
        }
      } catch {}

      const v1Label = path.relative(config.getRepoDir(repo), v1File);
      const v2Label = path.relative(config.getRepoDir(repo), v2File);
      const patch = createTwoFilesPatch(v1Label, v2Label, v1Contents, v2Contents);
      if (!/@@/.test(patch)) {
        // No difference found
        continue;
      }
      repo.changed = true;
      const chunk = patch.replace(/^Index:.*\n===+$/m, `diff ${v1Label} ${v2Label}`);
      await fs.appendFile(config.getRepoDiff(repo), chunk, { encoding: 'utf8' });

      const jsonChunk = diffString(v1Json ?? '', v2Json ?? '');
      if (jsonChunk) {
        jsonResults += `<div class="file-header">json-diff ${v1Label} ${v2Label}</div>\n<pre>${prepareJsonChunk(
          jsonChunk
        )}</pre>`;
      }
    }
    repo.changed = repo.changed === true; // convert null to false
    if (repo.changed) {
      if (jsonResults) {
        const jsonReport = jsonTemplate
          .replace(/\$NAME/g, `${repo.name}#${repo.branch}`)
          .replace(/\$SUSHI1/g, config.version1)
          .replace(/\$SUSHI2/g, config.version2)
          .replace('$DIFF', jsonResults);
        await fs.writeFile(config.getRepoJsonDiffReport(repo), jsonReport, 'utf8');
      }
      const diffReportTemplate = htmlTemplate
        .replace(/\$NAME/g, `${repo.name}#${repo.branch}`)
        .replace(/\$SUSHI1/g, config.version1)
        .replace(/\$SUSHI2/g, config.version2);
      await fs.writeFile(config.getRepoDiffReport(repo), diffReportTemplate, 'utf8');
      await util.promisify(execFile)(
        'npx',
        [
          '-q',
          'diff2html',
          '-i',
          'file',
          '-s',
          'side',
          '--hwt',
          config.getRepoDiffReport(repo),
          '-F',
          config.getRepoDiffReport(repo),
          '--',
          config.getRepoDiff(repo)
        ],
        { cwd: path.dirname(__dirname), shell: true }
      );
      process.stdout.write(': CHANGED');
    } else {
      process.stdout.write(': SAME');
    }
    const deltaSeconds = repo.getTimeDeltaSeconds();
    if (deltaSeconds !== 0) {
      const deltaPercentage = repo.getTimeDeltaPercentage();
      const label = deltaSeconds > 0 ? 'slower' : 'faster';
      process.stdout.write(
        ` (${Math.abs(deltaPercentage)}% / ${Math.abs(deltaSeconds)}s ${label})`
      );
    }
    process.stdout.write('\n');
  } catch (e) {
    repo.changed = true;
    const message = `Error comparing results: ${e}`;
    await fs.writeFile(config.getRepoJsonDiffReport(repo), message, 'utf8');
    await fs.writeFile(config.getRepoDiffReport(repo), message, 'utf8');
    process.stdout.write(': ERROR\n');
  }
}

// diffString returns console control characters, so convert those to useful html tags
function prepareJsonChunk(jsonChunk: string): string {
  return jsonChunk
    .replace(/\x1b\[32m/g, '<span class="plus">')
    .replace(/\x1b\[31m/g, '<span class="minus">')
    .replace(/\x1b\[39m/g, '</span>');
}

async function getFilesRecursive(dir: string): Promise<string[]> {
  const isDirectory = await (await fs.stat(dir)).isDirectory();
  if (isDirectory) {
    const children = await fs.readdir(dir);
    const ancestors = await Promise.all(children.map(f => getFilesRecursive(path.join(dir, f))));
    return ([] as string[]).concat(...ancestors);
  } else {
    return [dir];
  }
}

async function readFile(file: string): Promise<string> {
  if (await fs.pathExists(file)) {
    return fs.readFile(file, 'utf8');
  }
  return '';
}

function sortRepos(repos: Repo[]) {
  repos.sort((a, b) => {
    // Aborted repos go last
    if (a.error || b.error) {
      return a.error && b.error ? 0 : a.error ? 1 : -1;
    }
    // Repos with diffs go first
    if (a.changed !== b.changed) {
      return a.changed ? -1 : 1;
    }
    // Repos with a change in error count go next
    const [aErrsChanged, bErrsChanged] = [a, b].map(
      repo => repo.sushiStats1.errors !== repo.sushiStats2.errors
    );
    if (aErrsChanged != bErrsChanged) {
      return aErrsChanged ? -1 : 1;
    }
    // Repos with a change in warning count go next
    const [aWrnsChanged, bWrnsChanged] = [a, b].map(
      repo => repo.sushiStats1.warnings !== repo.sushiStats2.warnings
    );
    if (aWrnsChanged != bWrnsChanged) {
      return aWrnsChanged ? -1 : 1;
    }
    // Then by delta time to run (in seconds)
    const [aDeltaSeconds, bDeltaSeconds] = [a, b].map(repo => Math.abs(repo.getTimeDeltaSeconds()));
    if (aDeltaSeconds != bDeltaSeconds) {
      return bDeltaSeconds - aDeltaSeconds;
    }
    // Then by delta time to run (in percent)
    const [aDeltaPercent, bDeltaPercent] = [a, b].map(repo =>
      Math.abs(repo.getTimeDeltaPercentage())
    );
    if (aDeltaPercent != bDeltaPercent) {
      return bDeltaPercent - aDeltaPercent;
    }
    // Then alphabetical
    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  });
}

function reportErrors(repo: Repo) {
  const [errs1, errs2] = [repo.sushiStats1.errors, repo.sushiStats2.errors];
  return errs1 === errs2 ? errs1 : `<strong>${errs1} → ${errs2}</strong>`;
}

function reportWarnings(repo: Repo) {
  const [wrns1, wrns2] = [repo.sushiStats1.warnings ?? '?', repo.sushiStats2.warnings ?? '?'];
  return wrns1 === wrns2 ? wrns1 : `<strong>${wrns1} → ${wrns2}</strong>`;
}

function reportElapsed(repo: Repo) {
  const [time1, time2] = [
    repo.sushiStats1.elapsedSeconds ?? 0,
    repo.sushiStats2.elapsedSeconds ?? 0
  ];
  if (time1 === time2) {
    return time1;
  } else {
    return `${time1} → ${time2}`;
  }
}

function reportPerformance(repo: Repo) {
  const deltaSeconds = repo.getTimeDeltaSeconds();
  if (deltaSeconds === 0) {
    return '';
  }
  const deltaPercent = repo.getTimeDeltaPercentage();
  const color = deltaSeconds > 0 ? 'red' : 'green';
  const label = deltaSeconds > 0 ? 'slower' : 'faster';
  return `<span style="color:${color}">${Math.abs(deltaPercent)}% ${label} (${Math.abs(deltaSeconds)} seconds)</span>`;
}

function reportAveragePerformance(deltaPercent: number, numRepos?: number) {
  const repos = numRepos == null ? '' : ` (${numRepos} repos)`;
  if (deltaPercent === 0) {
    return `0%${repos}`;
  } else if (Number.isNaN(deltaPercent)) {
    return `n/a${repos}`;
  }
  const color = deltaPercent > 0 ? 'red' : 'green';
  const label = deltaPercent > 0 ? 'slower' : 'faster';
  return `<span style="color:${color}">${Math.abs(deltaPercent)}% ${label}</span>${repos}`;
}

function roundAwayFromZero(num: number) {
  // Math.round always rounds up (e.g., round(-0.5) is 0)
  // but we want to round away from zero (e.g. round(-0.5) is -1)
  return Math.round(Math.abs(num)) * (num < 0 ? -1 : 1);
}

async function createReport(repos: Repo[], elapsed: number, config: Config) {
  sortRepos(repos);
  const stats = new SummaryStats(repos, elapsed);
  const reportFile = config.getOverallDiffReport();
  await fs.appendFile(
    reportFile,
    `
<html>
  <head>
    <!-- Styles adapted from https://www.makeuseof.com/html-tables-css-modern-styles -->
    <style>
      table {
        border-collapse: collapse;
        width: 100%;
        color: #333;
        font-family: Arial, sans-serif;
        font-size: 14px;
        text-align: left;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        margin: auto;
        margin-top: 10px;
        margin-bottom: 50px;
      }

      table th {
        background-color: #3c00ff;
        color: #fff;
        font-weight: bold;
        padding: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-top: 1px solid #fff;
        border-bottom: 1px solid #ccc;
      }

      table tr:nth-child(even) td {
        background-color: #f2f2f2;
      }

      table tr:hover td {
        background-color: #ffedcc;
      }

      table td {
        background-color: #fff;
        padding: 10px;
        border-bottom: 1px solid #ccc;
      }

      table#summary {
        margin: 0;
        width: auto;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <h1>SUSHI Regression Results</h1>
    <h2>Options: ${getOptionStrings(config).join(' ')}</h2>
    <table id="summary">
      <thead>
        <tr>
          <th colspan="2">Summary</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Repos</td>
          <td>${stats.totalRepos}</td>
        </tr>
        <tr>
          <td>Repos w/ Different Output</td>
          <td>${stats.reposWithDiffOutput}</td>
        </tr>
        <tr>
          <td>Repos w/ Different Error Count</td>
          <td>${stats.reposWithDiffErrors}</td>
        </tr>
        <tr>
          <td>Repos w/ Different Warning Count</td>
          <td>${stats.reposWithDiffWarnings}</td>
        </tr>
        <tr>
          <td>Mean Performance</td>
          <td>${reportAveragePerformance(stats.avgTimeDeltaPercentage)}</td>
        </tr>
        <tr>
          <td>Mean Performance for Slower Repos</td>
          <td>${reportAveragePerformance(stats.avgTimeSlowerPercentage, stats.reposWithSlowerTime)}</td>
        </tr>
        <tr>
          <td>Mean Performance for Faster Repos</td>
          <td>${reportAveragePerformance(stats.avgTimeFasterPercentage, stats.reposWithFasterTime)}</td>
        </tr>
        <tr>
          <td>Total Time</td>
          <td>${stats.totalTime} seconds</td>
        </tr>
      </tbody>
    </table>
    <h2>Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>Repo</th>
          <th>Errors</th>
          <th>Warnings</th>
          <th>Time (sec)</th>
          <th>Performance</th>
          <th>Logs</th>
          <th>Diff</th>
        </tr>
      </thead>
      <tbody>
`,
    { encoding: 'utf8' }
  );
  for (const repo of repos.filter(r => !r.error)) {
    const sushiLog1 = path.relative(config.output, config.getRepoSUSHILogFile(repo, 1));
    const sushiLog2 = path.relative(config.output, config.getRepoSUSHILogFile(repo, 2));
    const diffReport = path.relative(config.output, config.getRepoDiffReport(repo));
    const jsonReport = path.relative(config.output, config.getRepoJsonDiffReport(repo));
    // prettier-ignore
    await fs.appendFile(
      reportFile,
      `
        <tr>
          <td><a href="https://github.com/${repo.name}/tree/${repo.branch}/"><strong>${repo.name}#${repo.branch}</strong></a></td>
          <td>${reportErrors(repo)}</td>
          <td>${reportWarnings(repo)}</td>
          <td>${reportElapsed(repo)}</td>
          <td>${reportPerformance(repo)}</td>
          <td><a href="${sushiLog1}">${config.version1}</a> → <a href="${sushiLog2}">${config.version2}</a></td>
          <td>${
            repo.changed ? `<a href="${diffReport}">HTML</a> | <a href="${jsonReport}">JSON</a>` : ''
          }</td>
        </tr>
`,
      { encoding: 'utf8' }
    );
  }
  for (const repo of repos.filter(r => r.error)) {
    await fs.appendFile(
      reportFile,
      `
        <tr>
          <td><a href="https://github.com/${repo.name}/tree/${repo.branch}/"><strong>${repo.name}#${repo.branch}</strong></a></td>
          <td colspan="6"><em>aborted</em></td>
        </tr>
`,
      { encoding: 'utf8' }
    );
  }
  await fs.appendFile(
    reportFile,
    `
      </tbody>
    </table>
  </body>
</html>
`,
    { encoding: 'utf8' }
  );
  const numError = repos.reduce((sum, repo) => sum + (repo.error ? 1 : 0), 0);
  if (numError > 0) {
    console.log();
    console.log(
      chalk.redBright(
        `Processing errors detected. Unable to run regression on ${numError} of ${
          repos.length
        } repo${repos.length > 1 ? 's' : ''}.`
      )
    );
  }
  console.log();
  const numChanged = repos.reduce((sum, repo) => sum + (repo.changed ? 1 : 0), 0);
  if (numChanged > 0) {
    console.log(
      `Changes detected.  ${numChanged} of ${repos.length} repo${
        repos.length > 1 ? 's' : ''
      } had differences in output.`
    );
  } else {
    console.log('No changes detected.');
  }
  opener(reportFile);
}
