/* eslint-disable @typescript-eslint/camelcase */
import path from 'path';
import axios from 'axios';
import fs from 'fs-extra';
import { remove, uniqBy } from 'lodash';

const GH_URL_RE = /(git@github\.com:|git:\/\/github\.com|https:\/\/github\.com).*\/([^/]+)\.git/;
const BUILD_URL_RE = /^([^/]+)\/([^/]+)\/branches\/([^/]+)\/qa\.json$/;

async function main() {
  const ghRepos = await getReposFromGitHub();
  const buildRepos = await getNonHL7ReposFromBuild();
  const fshRepos = await getReposWithFSHFolder([...ghRepos, ...buildRepos]);
  const repoFilePath = path.join(__dirname, 'all-repos.txt');
  const repoFile = fs.readFileSync(repoFilePath, 'utf8');
  const lines = repoFile.split(/\r?\n/);

  // First remove any found repos that are already listed in the file (commented or not)
  lines.forEach(line => {
    const repoURL = line.match(GH_URL_RE)?.[0];
    if (repoURL) {
      remove(fshRepos, r => [r.ssh_url, r.git_url, r.clone_url].indexOf(repoURL) !== -1);
    }
  });

  if (fshRepos.length) {
    // Then add the remaining repos
    lines.push(`# Added ${new Date()}`);
    lines.push(...fshRepos.map(r => r.ssh_url));
    lines.push('');

    // Write it out
    fs.writeFileSync(repoFilePath, lines.join('\n'), 'utf8');
    console.log(`Added ${fshRepos.length} repos to ${repoFilePath}.`);
  } else {
    console.log(`No new repos found; ${repoFilePath} already contains all known FSH repos.`);
  }
}

async function getReposFromGitHub(): Promise<GHRepo[]> {
  console.log('Getting HL7 repos using GitHub API...');
  const repos: GHRepo[] = [];
  for (let page = 1; true; page++) {
    const res = await axios.get(
      `https://api.github.com/orgs/HL7/repos?sort=full_name&per_page=100&page=${page}`
    );
    if (Array.isArray(res?.data)) {
      repos.push(...res.data.filter(r => r.size > 0 && !r.archived && !r.disabled));
      if (res.data.length < 100) {
        // no more results after this, so break
        break;
      }
    } else {
      break;
    }
  }
  console.log(`Found ${repos.length} active repos at github.com/HL7.`);
  return repos;
}

async function getNonHL7ReposFromBuild(): Promise<GHRepo[]> {
  console.log('Getting non-HL7 repos from the auto-builder report...');
  const repoToBranches: Map<string, string[]> = new Map();
  // Build up the map
  const res = await axios.get('https://build.fhir.org/ig/qas.json');
  if (Array.isArray(res?.data)) {
    res.data.forEach(build => {
      const matches = build.repo?.match(BUILD_URL_RE);
      if (matches) {
        const repo = `${matches[1]}/${matches[2]}`;
        if (!repoToBranches.has(repo)) {
          repoToBranches.set(repo, [matches[3]]);
        } else {
          repoToBranches.get(repo).push(matches[3]);
        }
      }
    });
  }
  // Now convert the map to GHRepo objects
  const repos: GHRepo[] = [];
  repoToBranches.forEach((branches, repo) => {
    // Skip HL7 ones since we got them from GitHub already
    if (!repo.startsWith('HL7/')) {
      // We don't want to use GH API to get default branch (due to API rate limits, so just do our best...)
      repos.push({
        default_branch: branches.indexOf('main') != -1 ? 'main' : 'master',
        html_url: `https://github.com/${repo}`,
        clone_url: `https://github.com/${repo}.git`,
        git_url: `git://github.com/${repo}.git`,
        ssh_url: `git@github.com:${repo}.git`
      });
    }
  });
  console.log(`Found ${repos.length} non-HL7 repos in the auto-builder report.`);
  return repos;
}

async function getReposWithFSHFolder(repos: GHRepo[]): Promise<GHRepo[]> {
  const fshRepos: GHRepo[] = [];
  for (const repo of uniqBy(repos, r => r.html_url.toLowerCase())) {
    try {
      console.log(`Checking ${repo.html_url} for /fsh folder...`);
      await axios.head(`${repo.html_url}/tree/${repo.default_branch}/fsh`);
      fshRepos.push(repo);
    } catch (e) {
      // 404: no fsh folder
    }
  }
  console.log(`${fshRepos.length} repos had a /fsh folder.`);
  return fshRepos;
}

interface GHRepo {
  html_url: string;
  default_branch: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
}

main();
