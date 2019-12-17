// TODO: Load from package files instead of these static folders.
import { FHIRDefinitions } from './FHIRDefinitions';
import { PackageLoadError, DevPackageLoadError } from '../errors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import tmp from 'tmp';
import tar from 'tar';
import request from 'sync-request';

const _cache: Map<string, FHIRDefinitions> = new Map();

// TODO: remove load and treat FHIR Defs as any other package
export function load(fhirVersion: string): FHIRDefinitions {
  if (!_cache.has(fhirVersion)) {
    const result = new FHIRDefinitions();
    // Load the base FHIR definitions
    const files = [
      `${__dirname}/fhir-${fhirVersion}/extension-definitions.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-resources.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-types.json`,
      `${__dirname}/fhir-${fhirVersion}/profiles-others.json`,
      `${__dirname}/fhir-${fhirVersion}/valuesets.json`
    ];
    for (const file of files) {
      const definitions = JSON.parse(fs.readFileSync(file, 'utf-8'));
      for (const entry of definitions.entry) {
        result.add(entry.resource);
      }
    }

    _cache.set(fhirVersion, result);
  }

  return _cache.get(fhirVersion);
}

// TODO add tests of this function
/**
 * Loads a dependency from user FHIR cache or from online
 * @param {string} packageName - The name of the package to load
 * @param {string} version - The version of the package to load
 * @param {FHIRDefinitions} FHIRDefs - The FHIRDefinitions to load the dependencies into
 * @param {string} cachePath - The path to load the package into
 * @throws {PackageLoadError} when the desired package can't be loaded
 */
export function loadDependency(
  packageName: string,
  version: string,
  FHIRDefs: FHIRDefinitions,
  cachePath: string = null
): void {
  cachePath = cachePath ?? path.join(os.homedir(), '.fhir', 'packages');
  const targetPath = path.join(cachePath, `${packageName}#${version}`, 'package');
  const fullPackageName = `${packageName}#${version}`;
  let loadedPackage = loadFromPath(targetPath, fullPackageName, FHIRDefs);
  if (!loadedPackage) {
    let packageUrl: string;
    if (version === 'dev') {
      // dev packages must be present in local FHIR cache
      throw new DevPackageLoadError(fullPackageName);
    } else if (version === 'current') {
      // current packages need to be loaded using build.fhir.org
      const baseUrl = 'http://build.fhir.org/ig';
      const res = request('GET', `${baseUrl}/qas.json`);
      const qaJSON = JSON.parse(String.fromCharCode(...new Uint16Array(res.body as Buffer)));
      const matchingPackages = qaJSON.filter((p: any) => p['package-id'] === packageName);
      const newestPackage = matchingPackages.sort((p1: any, p2: any) => {
        return Date.parse(p2['date']) - Date.parse(p1['date']);
      })[0];
      packageUrl = `${baseUrl}/${newestPackage.repo}/package.tgz`;
    } else {
      // Load package into the user's cache
      packageUrl = `http://packages.fhir.org/${packageName}/${version}`;
    }
    const tempFile = tmp.fileSync();
    const targetDirectory = path.join(cachePath, fullPackageName);
    const res = request('GET', packageUrl);
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory);
    }
    fs.writeFileSync(tempFile.name, res.body);
    tar.x({
      cwd: targetDirectory,
      file: tempFile.name,
      sync: true,
      strict: true
    });
    // Now try to load again from the path
    loadedPackage = loadFromPath(targetPath, fullPackageName, FHIRDefs);
    if (!loadedPackage) {
      throw new PackageLoadError(fullPackageName);
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
          const def = JSON.parse(fs.readFileSync(path.join(targetPath, file), 'utf-8'));
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
