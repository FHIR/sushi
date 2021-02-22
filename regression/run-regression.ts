import path from 'path';
import util from 'util';
import temp from 'temp';
import { execFile } from 'child_process';
import fs from 'fs-extra';
import axios from 'axios';
import program from 'commander';
import readlineSync from 'readline-sync';
import extract from 'extract-zip';
import opener from 'opener';
import { isEqual, union } from 'lodash';
import { createTwoFilesPatch } from 'diff';

// Track temporary files so they are deleted when the process exits
temp.track();

class Config {
  repoFile: string;
  version1: string;
  version2: string;
  output: string;
  private tempFolder: string;

  constructor() {
    this.tempFolder = temp.path('sushi-regression');
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

  getOverallDiffReport(): string {
    return path.join(this.output, 'index.html');
  }

  private sanitize(input: string): string {
    // Replace most symbols with '-', but don't allow '-' as first character
    return input.replace(/[^A-Za-z0-9_.\-]+/g, '-').replace(/^-+/, '');
  }
}

class Repo {
  public changed: boolean;
  public elapsed: number;
  public sushiErrorNum1: number;
  public sushiErrorNum2: number;

  constructor(public name: string, public branch: string) {}

  getDownloadURL() {
    return `https://github.com/${this.name}/archive/${this.branch}.zip`;
  }
}

async function main() {
  const start = new Date();
  const config = processProgramArguments();
  await prepareOutputFolder(config);
  const htmlTemplate = await fs.readFile(path.join(__dirname, 'template.html'), 'utf8');
  await Promise.all([setupSUSHI(1, config), setupSUSHI(2, config)]);
  const repos = await getRepoList(config);
  // Iterate repos synchronously since running more than one SUSHI in parallel might cause
  // issues w/ .fhir cache management. We *could* do the downloads and extractions and
  // reporting in parallel, but it's not clear if many efficiencies would be gained.
  let i = 1;
  for (const repo of repos) {
    const repoStart = new Date();
    console.log();
    console.log(`Processing ${repo.name}#${repo.branch} (${i++} of ${repos.length})`);
    await downloadAndExtractRepo(repo, config);
    // We can only run SUSHI one at a time due to its asynch management of the .fhir cache
    repo.sushiErrorNum1 = await runSUSHI(1, repo, config);
    repo.sushiErrorNum2 = await runSUSHI(2, repo, config);
    await generateDiff(repo, config, htmlTemplate);
    repo.elapsed = Math.ceil((new Date().getTime() - repoStart.getTime()) / 1000);
  }
  await createReport(repos, config);
  const elapsed = Math.ceil((new Date().getTime() - start.getTime()) / 1000);
  console.log(`Total time: ${elapsed} seconds`);
}

function processProgramArguments(): Config {
  const config = new Config();
  program
    .arguments('[repoFile] [version1] [version2]')
    .description('run-regression', {
      repoFile:
        'A text file for which each line is a GitHub {org}/{repo}#{branch} to run regression on (e.g., HL7/fhir-mCODE-ig#master).',
      version1:
        'The base version of SUSHI to use. Can be an NPM version number or tag, "gh:branch" to use a GitHub branch, or "local" to use the local code with ts-node.',
      version2:
        'The version of SUSHI under test. Can be an NPM version number or tag, "gh:branch" to use a GitHub branch, or "local" to use the local code with ts-node.'
    })
    .action(function (repoFile, version1, version2) {
      config.repoFile = repoFile || path.join(__dirname, 'repos-select.txt');
      config.version1 = version1 || 'gh:master';
      config.version2 = version2 || 'local';
      config.output = path.join(__dirname, 'output');
    });
  program.parse(process.argv);

  console.log('Running SUSHI regression with');
  console.log(`  - repoFile: ${path.relative('.', config.repoFile)}`);
  console.log(`  - version1: ${config.version1}`);
  console.log(`  - version2: ${config.version2}`);
  console.log(`  - output:   ${path.relative('.', config.output)}`);
  console.log();

  return config;
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
    const zipRoot = path.join(tempSushiDir, zipRootFolderName);
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
  const contents = await fs.readFile(config.repoFile, 'utf8');
  const lines = contents
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && line[0] !== '#');
  const repos: Repo[] = [];
  lines.forEach(line => {
    const parts = line.split(/#/, 2);
    if (parts.length !== 2 || !parts[0].match(/^.+\/.+$/)) {
      console.error(
        `Skipping invalid line: "${line}". Repos must be listed using format "userOrOrg/repoName branchName"`
      );
      return;
    }
    repos.push(new Repo(parts[0].trim(), parts[1].trim()));
  });
  return repos;
}

async function downloadAndExtractRepo(repo: Repo, config: Config) {
  console.log(`  - Downloading ${repo.getDownloadURL()}`);
  const repoOutput = config.getRepoDir(repo);
  await fs.mkdirp(repoOutput);
  await downloadAndExtractZip(repo.getDownloadURL(), config.getRepoZipFile(repo), repoOutput);
  const zipRootFolderName = await (await fs.readdir(repoOutput)).find(name => /\w/.test(name));
  const zipRoot = path.join(repoOutput, zipRootFolderName);
  await fs.move(zipRoot, config.getRepoSUSHIDir(repo, 1));
  return fs.copy(config.getRepoSUSHIDir(repo, 1), config.getRepoSUSHIDir(repo, 2), {
    recursive: true
  });
}

async function downloadAndExtractZip(zipURL: string, zipPath: string, extractTo: string) {
  await axios({
    method: 'get',
    url: zipURL,
    responseType: 'stream'
  }).then(response => {
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  });
  await extract(zipPath, { dir: extractTo });
  await fs.unlink(zipPath);
}

async function runSUSHI(num: 1 | 2, repo: Repo, config: Config): Promise<number> {
  const version = config.getVersion(num);
  const repoSUSHIDir = config.getRepoSUSHIDir(repo, num);
  console.log(`  - Running SUSHI ${version}`);
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
  let out = '==================================== STDOUT ====================================\n';
  out += result.stdout || '<empty>';
  out += '\n\n';
  out += '==================================== STDERR ====================================\n';
  out += result.stderr || '<empty>';
  await fs.writeFile(`${repoSUSHIDir}.log`, out, 'utf8');
  return result.code ?? 0;
}

async function generateDiff(repo: Repo, config: Config, htmlTemplate: string): Promise<void> {
  process.stdout.write('  - Comparing output ');
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
  //Don't use forEach because it can result in files out-of-order due to async
  for (const file of files) {
    const v1File = path.join(repoSUSHIDir1, file);
    const v2File = path.join(repoSUSHIDir2, file);
    const [v1Contents, v2Contents] = await Promise.all([readFile(v1File), readFile(v2File)]);

    try {
      if (isEqual(JSON.parse(v1Contents), JSON.parse(v2Contents))) {
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
  }
  repo.changed = repo.changed === true; // convert null to false
  if (repo.changed) {
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
    process.stdout.write(': CHANGED\n');
  } else {
    process.stdout.write(': SAME\n');
  }
}

async function getFilesRecursive(dir: string): Promise<string[]> {
  const isDirectory = await (await fs.stat(dir)).isDirectory();
  if (isDirectory) {
    const children = await fs.readdir(dir);
    const ancestors = await Promise.all(children.map(f => getFilesRecursive(path.join(dir, f))));
    return [].concat(...ancestors);
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

async function createReport(repos: Repo[], config: Config) {
  const reportFile = config.getOverallDiffReport();
  await fs.appendFile(
    reportFile,
    `
<html>
  <body>
    <table>
      <thead>
        <tr>
          <th>Repo</th>
          <th>Diff</th>
          <th>Log 1 (# errors)</th>
          <th>Log 2 (# errors)</th>
          <th>Time (sec)</th>
        </tr>
      </thead>
      <tbody>
`,
    { encoding: 'utf8' }
  );
  for (const repo of repos) {
    const sushiLog1 = config.getRepoSUSHILogFile(repo, 1);
    const sushiLog2 = config.getRepoSUSHILogFile(repo, 2);
    const diffReport = config.getRepoDiffReport(repo);
    // prettier-ignore
    await fs.appendFile(
      reportFile,
      `
          <tr>
            <td style="padding: 10px;">${repo.name}#${repo.branch}</td>
            <td style="padding: 10px;">${
              repo.changed ? `<a href="${diffReport}">${path.basename(diffReport)}</a>` : 'n/a'
            }</td>
            <td style="padding: 10px;">
              <a href="${sushiLog1}">${path.basename(sushiLog1)}</a>
              (<span${repo.sushiErrorNum1 > 0 ? ' style="color:red"' : ''}>${repo.sushiErrorNum1}</span>)
            </td>
            <td style="padding: 10px;">
              <a href="${sushiLog2}">${path.basename(sushiLog2)}</a>
              (<span${repo.sushiErrorNum2 > 0 ? ' style="color:red"' : ''}>${repo.sushiErrorNum2}</span>)
            </td>
            <td style="padding: 10px;">${repo.elapsed}</td>
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

main().catch(err => {
  console.error('Unexpected error: ', err);
});
