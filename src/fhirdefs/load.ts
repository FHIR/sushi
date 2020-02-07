import { FHIRDefinitions } from './FHIRDefinitions';
import { PackageLoadError, DevPackageLoadError, CurrentPackageLoadError } from '../errors';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import tar from 'tar';
import rp from 'request-promise-native';
import temp from 'temp';
import { logger } from '../utils';

/**
 * Loads a dependency from user FHIR cache or from online
 * @param {string} packageName - The name of the package to load
 * @param {string} version - The version of the package to load
 * @param {FHIRDefinitions} FHIRDefs - The FHIRDefinitions to load the dependencies into
 * @param {string} cachePath - The path to load the package into
 * @returns {Promise<FHIRDefinitions>} the loaded FHIRDefs
 * @throws {PackageLoadError} when the desired package can't be loaded
 */
export async function loadDependency(
  packageName: string,
  version: string,
  FHIRDefs: FHIRDefinitions,
  cachePath: string = path.join(os.homedir(), '.fhir', 'packages')
): Promise<FHIRDefinitions> {
  const fullPackageName = `${packageName}#${version}`;
  const loadPath = path.join(cachePath, fullPackageName, 'package');
  let loadedPackage: string;
  if (version != 'current') {
    logger.info(`Checking local cache for ${fullPackageName}...`);
    loadedPackage = loadFromPath(loadPath, fullPackageName, FHIRDefs);
    if (loadedPackage) {
      logger.info(`Found ${fullPackageName} in local cache.`);
    } else {
      logger.info(`Did not find ${fullPackageName} in local cache.`);
    }
  }
  if (!loadedPackage) {
    let packageUrl: string;
    if (version === 'dev') {
      // Dev packages must be present in local FHIR cache
      throw new DevPackageLoadError(fullPackageName);
    } else if (version === 'current') {
      // Current packages need to be loaded using build.fhir.org
      const baseUrl = 'http://build.fhir.org/ig';
      const res: { 'package-id': string; date: string; repo: string }[] = await rp.get({
        uri: `${baseUrl}/qas.json`,
        json: true
      });
      // Find matching packages and sort by date to get the most recent
      let newestPackage;
      if (res && res.length > 0) {
        const matchingPackages = res.filter(p => p['package-id'] === packageName);
        newestPackage = matchingPackages.sort((p1, p2) => {
          return Date.parse(p2['date']) - Date.parse(p1['date']);
        })[0];
      }
      if (newestPackage && newestPackage.repo) {
        // Find the package based on the first two parts of the package's 'repo' property.  E.g.,
        //   "repo": "HL7/US-Core-R4/branches/test-branch-tweak/qa.json"
        // means to find the package at:
        //    http://build.fhir.org/ig/HL7/US-Core-R4/package.tgz
        // See: https://chat.fhir.org/#narrow/stream/179165-committers/topic/Build.20Problem/near/187610137
        const [org, repo] = newestPackage.repo.split('/');
        packageUrl = `${baseUrl}/${org}/${repo}/package.tgz`;
      } else {
        throw new CurrentPackageLoadError(fullPackageName);
      }
    } else {
      // All non-current packages are stored at packages.fhir.org
      packageUrl = `http://packages.fhir.org/${packageName}/${version}`;
    }
    // Create a temporary file and write the package to there
    temp.track();
    const tempFile = temp.openSync();
    const targetDirectory = path.join(cachePath, fullPackageName);
    let res;
    try {
      logger.info(`Downloading ${fullPackageName}...`);
      res = await rp.get({
        uri: packageUrl,
        encoding: null,
        transform: (body, response) => {
          if (response.statusCode < 200 || response.statusCode > 299) {
            return body.toString();
          }
          return body;
        }
      });
      logger.info(`Downloaded ${fullPackageName}`);
    } catch (e) {
      e.message = `${e.statusCode} - ${e.response}`;
      throw e;
    }

    fs.ensureDirSync(targetDirectory);
    fs.writeFileSync(tempFile.path, res);
    // Extract the package from that temporary file location
    tar.x({
      cwd: targetDirectory,
      file: tempFile.path,
      sync: true,
      strict: true
    });

    // Now try to load again from the path
    loadedPackage = loadFromPath(loadPath, fullPackageName, FHIRDefs);
    if (!loadedPackage) {
      // If we fail again, then we couldn't get the package locally or from online
      throw new PackageLoadError(fullPackageName);
    }
  }
  return FHIRDefs;
}

/**
 * Loads a set of JSON files at targetPath into FHIRDefs
 * @param {string} targetPath - The path to the directory containing the JSON definitions
 * @param {string} targetPackage - The name of the package we are trying to load
 * @param {FHIRDefinitions} FHIRDefs - The FHIRDefinitions object to load defs into
 * @returns {string} the name of the loaded package if successful
 */
export function loadFromPath(
  targetPath: string,
  targetPackage: string,
  FHIRDefs: FHIRDefinitions
): string {
  if (FHIRDefs.packages.indexOf(targetPackage) < 0) {
    const originalSize = FHIRDefs.size();
    if (fs.existsSync(targetPath)) {
      const files = fs.readdirSync(targetPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const def = JSON.parse(fs.readFileSync(path.join(targetPath, file), 'utf-8').trim());
          FHIRDefs.add(def);
        }
      }
    }
    // If we did successfully load definitions, mark this package as loaded
    if (FHIRDefs.size() > originalSize) {
      FHIRDefs.packages.push(targetPackage);
      return targetPackage;
    }
  } else {
    // If the package has already been loaded, just return the targetPackage string
    return targetPackage;
  }
}
