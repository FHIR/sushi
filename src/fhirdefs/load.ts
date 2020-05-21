import { FHIRDefinitions } from './FHIRDefinitions';
import { PackageLoadError, CurrentPackageLoadError } from '../errors';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import tar from 'tar';
import axios from 'axios';
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
  let fullPackageName = `${packageName}#${version}`;
  let loadPath = path.join(cachePath, fullPackageName, 'package');
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
      // When a dev package is not present locally, fall back to using the current version
      // as described here https://confluence.hl7.org/pages/viewpage.action?pageId=35718627#IGPublisherDocumentation-DependencyList
      logger.info(
        `Falling back to ${packageName}#current since ${fullPackageName} is not locally cached. To avoid this, add ${fullPackageName} to your local FHIR cache.`
      );
      version = 'current';
      fullPackageName = `${packageName}#${version}`;
      loadPath = path.join(cachePath, fullPackageName, 'package');
    }
    if (version === 'current') {
      // Current packages need to be loaded using build.fhir.org
      const baseUrl = 'http://build.fhir.org/ig';
      const res = await axios.get(`${baseUrl}/qas.json`);
      const qaData: { 'package-id': string; date: string; repo: string }[] = res?.data;
      // Find matching packages and sort by date to get the most recent
      let newestPackage;
      if (qaData && qaData.length > 0) {
        const matchingPackages = qaData.filter(p => p['package-id'] === packageName);
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
    logger.info(`Downloading ${fullPackageName}...`);
    const res = await axios.get(packageUrl, {
      responseType: 'arraybuffer'
    });
    logger.info(`Downloaded ${fullPackageName}`);

    fs.ensureDirSync(targetDirectory);
    fs.writeFileSync(tempFile.path, res?.data);
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
 * Loads custom resources defined in ig-data into FHIRDefs
 * @param {string} input - The input path to the cli
 * @param {FHIRDefinitions} defs - The FHIRDefinitions object to load definitions into
 */
export function loadCustomResources(input: string, defs: FHIRDefinitions): void {
  // Similar code for loading custom resources exists in IGExporter.ts addPredefinedResources()
  const pathEnds = [
    'capabilities',
    'extensions',
    'models',
    'operations',
    'profiles',
    'resources',
    'vocabulary',
    'examples'
  ];
  for (const pathEnd of pathEnds) {
    let xmlFile = false;
    let invalidFile = false;
    const dirPath = path.join(input, 'ig-data', 'input', pathEnd);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        let resourceJSON: any;
        if (file.endsWith('.json')) {
          resourceJSON = fs.readJSONSync(path.join(dirPath, file));
        } else {
          xmlFile = xmlFile || file.endsWith('.xml');
          invalidFile = true;
          continue;
        }
        if (pathEnd !== 'examples') {
          // add() will only add resources of resourceType:
          // StructureDefinition, ValueSet, CodeSystem, or ImplementationGuide
          defs.add(resourceJSON);
        }
      }
    }
    if (invalidFile) {
      let message = `Invalid file detected in directory ${dirPath}. Input FHIR definitions must be JSON.`;
      if (xmlFile) {
        message += ' XML format not supported.';
      }
      logger.error(message);
    }
  }
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
