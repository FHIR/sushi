import { FHIRDefinitions } from './FHIRDefinitions';
import { PackageLoadError, CurrentPackageLoadError } from '../errors';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import tar from 'tar';
import axios from 'axios';
import junk from 'junk';
import temp from 'temp';
import { logger, getFilesRecursive } from '../utils';
import { Fhir as FHIRConverter } from 'fhir/fhir';

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
  const loadPath = path.join(cachePath, fullPackageName, 'package');
  let loadedPackage: string;

  // First, try to load the package from the local cache
  logger.info(`Checking local cache for ${fullPackageName}...`);
  loadedPackage = loadFromPath(cachePath, fullPackageName, FHIRDefs);
  if (loadedPackage) {
    logger.info(`Found ${fullPackageName} in local cache.`);
  } else {
    logger.info(`Did not find ${fullPackageName} in local cache.`);
  }

  // When a dev package is not present locally, fall back to using the current version
  // as described here https://confluence.hl7.org/pages/viewpage.action?pageId=35718627#IGPublisherDocumentation-DependencyList
  if (version === 'dev' && !loadedPackage) {
    logger.info(
      `Falling back to ${packageName}#current since ${fullPackageName} is not locally cached. To avoid this, add ${fullPackageName} to your local FHIR cache by building it locally with the HL7 FHIR IG Publisher.`
    );
    version = 'current';
    fullPackageName = `${packageName}#${version}`;
    loadedPackage = loadFromPath(cachePath, fullPackageName, FHIRDefs);
  }

  let packageUrl;
  if (packageName.startsWith('hl7.fhir.r5.') && version === 'current') {
    packageUrl = `https://build.fhir.org/${packageName}.tgz`;
    // TODO: Figure out how to determine if the cached package is current
    // See: https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Registry.20for.20FHIR.20Core.20packages.20.3E.204.2E0.2E1
    if (loadedPackage) {
      logger.info(
        `Downloading ${fullPackageName} since SUSHI cannot determine if the version in the local cache is the most recent build.`
      );
    }
  } else if (version === 'current') {
    // Even if a local current package is loaded, we must still check that the local package date matches
    // the date on the most recent version on build.fhir.org. If the date does not match, we re-download to the cache
    const baseUrl = 'https://build.fhir.org/ig';
    const res = await axios.get(`${baseUrl}/qas.json`);
    const qaData: { 'package-id': string; date: string; repo: string }[] = res?.data;
    // Find matching packages and sort by date to get the most recent
    let newestPackage;
    if (qaData?.length > 0) {
      const matchingPackages = qaData.filter(p => p['package-id'] === packageName);
      newestPackage = matchingPackages.sort((p1, p2) => {
        return Date.parse(p2['date']) - Date.parse(p1['date']);
      })[0];
    }
    if (newestPackage?.repo) {
      const [org, repo] = newestPackage.repo.split('/');
      const igUrl = `${baseUrl}/${org}/${repo}`;
      // get the package.manifest.json for the newest version of the package on build.fhir.org
      const manifest = await axios.get(`${igUrl}/package.manifest.json`);
      let cachedPackageJSON;
      if (fs.existsSync(path.join(loadPath, 'package.json'))) {
        cachedPackageJSON = fs.readJSONSync(path.join(loadPath, 'package.json'));
      }
      // if the date on the package.manifest.json does not match the date on the cached package
      // set the packageUrl to trigger a re-download of the package
      if (manifest?.data?.date !== cachedPackageJSON?.date) {
        packageUrl = `${igUrl}/package.tgz`;
        if (cachedPackageJSON) {
          logger.debug(
            `Cached package date for ${fullPackageName} (${formatDate(
              cachedPackageJSON.date
            )}) does not match last build date on build.fhir.org (${formatDate(
              manifest?.data?.date
            )})`
          );
          logger.info(
            `Cached package ${fullPackageName} is out of date and will be replaced by the more recent version found on build.fhir.org.`
          );
        }
      } else {
        logger.debug(
          `Cached package date for ${fullPackageName} (${formatDate(
            cachedPackageJSON.date
          )}) matches last build date on build.fhir.org (${formatDate(
            manifest?.data?.date
          )}), so the cached package will be used`
        );
      }
    } else {
      throw new CurrentPackageLoadError(fullPackageName);
    }
  } else if (!loadedPackage) {
    packageUrl = `https://packages.fhir.org/${packageName}/${version}`;

    // If this is an R4B or R5 package, then we may need to get it from packages2 if it is not in packages
    if (/^hl7\.fhir\.r(4b|5)\./.test(packageName)) {
      try {
        await axios.head(packageUrl);
      } catch {
        // It didn't exist in the normal registry.  Fallback to packages2 registry. This should be TEMPORARY.
        // See: https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Registry.20for.20FHIR.20Core.20packages.20.3E.204.2E0.2E1
        packageUrl = `https://packages2.fhir.org/packages/${packageName}/${version}`;
      }
    }
  }

  // If the packageUrl is set, we must download the package from that url, and extract it to our local cache
  if (packageUrl) {
    logger.info(`Downloading ${fullPackageName}...`);
    const res = await axios.get(packageUrl, {
      responseType: 'arraybuffer'
    });
    if (res?.data) {
      logger.info(`Downloaded ${fullPackageName}`);
      // Create a temporary file and write the package to there
      temp.track();
      const tempFile = temp.openSync();
      fs.writeFileSync(tempFile.path, res.data);
      // Extract the package to a temporary directory
      const tempDirectory = temp.mkdirSync();
      tar.x({
        cwd: tempDirectory,
        file: tempFile.path,
        sync: true,
        strict: true
      });
      cleanCachedPackage(tempDirectory);
      // Add or replace the package in the FHIR cache
      const targetDirectory = path.join(cachePath, fullPackageName);
      if (fs.existsSync(targetDirectory)) {
        fs.removeSync(targetDirectory);
      }
      fs.moveSync(tempDirectory, targetDirectory);
      // Now try to load again from the path
      loadedPackage = loadFromPath(cachePath, fullPackageName, FHIRDefs);
    } else {
      logger.info(`Unable to download most current version of ${fullPackageName}`);
    }
  }

  if (!loadedPackage) {
    // If we fail again, then we couldn't get the package locally or from online
    throw new PackageLoadError(fullPackageName);
  }
  logger.info(`Loaded package ${fullPackageName}`);
  return FHIRDefs;
}

/**
 * This function takes a package which contains contents at the same level as the "package" folder, and nests
 * all that content within the "package" folder.
 *
 * A package should have the format described here https://confluence.hl7.org/pages/viewpage.action?pageId=35718629#NPMPackageSpecification-Format
 * in which all contents are within the "package" folder. Some packages (ex US Core 3.1.0) have an incorrect format in which folders
 * are not sub-folders of "package", but are instead at the same level. The IG Publisher fixes these packages as described
 * https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/dev.20dependencies, so SUSHI should as well.
 *
 * @param {string} packageDirectory - The directory containing the package
 */
export function cleanCachedPackage(packageDirectory: string): void {
  if (fs.existsSync(path.join(packageDirectory, 'package'))) {
    fs.readdirSync(packageDirectory)
      .filter(file => file !== 'package')
      .forEach(file => {
        fs.renameSync(
          path.join(packageDirectory, file),
          path.join(packageDirectory, 'package', file)
        );
      });
  }
}

/**
 * Loads custom resources defined in resourceDir into FHIRDefs
 * @param {string} resourceDir - The path to the directory containing the resource subdirs
 * @param {FHIRDefinitions} defs - The FHIRDefinitions object to load definitions into
 */
export function loadCustomResources(resourceDir: string, defs: FHIRDefinitions): void {
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
  const converter = new FHIRConverter();
  let invalidFileCount = 0;
  for (const pathEnd of pathEnds) {
    let foundSpreadsheets = false;
    const dirPath = path.join(resourceDir, pathEnd);
    if (fs.existsSync(dirPath)) {
      const files = getFilesRecursive(dirPath);
      for (const file of files) {
        let resourceJSON: any;
        try {
          if (junk.is(file)) {
            // Ignore "junk" files created by the OS, like .DS_Store on macOS and Thumbs.db on Windows
            continue;
          } else if (file.endsWith('.json')) {
            resourceJSON = fs.readJSONSync(file);
          } else if (file.endsWith('-spreadsheet.xml')) {
            foundSpreadsheets = true;
            continue;
          } else if (file.endsWith('xml')) {
            const xml = fs.readFileSync(file).toString();
            if (/<\?mso-application progid="Excel\.Sheet"\?>/m.test(xml)) {
              foundSpreadsheets = true;
              continue;
            }
            resourceJSON = converter.xmlToObj(xml);
          } else {
            invalidFileCount++;
            continue;
          }
        } catch (e) {
          if (e.message.startsWith('Unknown resource type:')) {
            // Skip unknown FHIR resource types. When we have instances of Logical Models,
            // the resourceType will not be recognized as a known FHIR resourceType, but that's okay.
            continue;
          }
          logger.error(`Loading ${file} failed with the following error:\n${e.message}`);
          continue;
        }
        // All resources are added to the predefined map, so that this map can later be used to
        // access predefined resources in the IG Exporter
        defs.addPredefinedResource(file, resourceJSON);
        if (pathEnd !== 'examples') {
          // add() will only add resources of resourceType:
          // StructureDefinition, ValueSet, CodeSystem, or ImplementationGuide
          defs.add(resourceJSON);
        }
      }
    }
    if (foundSpreadsheets) {
      logger.info(
        `Found spreadsheets in directory ${dirPath}. SUSHI does not support spreadsheets, so any resources in the spreadsheets will be ignored.`
      );
    }
  }
  if (invalidFileCount > 0) {
    logger.info(
      invalidFileCount > 1
        ? `Found ${invalidFileCount} files in input/* resource folders that were neither XML nor JSON. These files were not processed as resources by SUSHI.`
        : `Found ${invalidFileCount} file in an input/* resource folder that was neither XML nor JSON. This file was not processed as a resource by SUSHI.`
    );
  }
}

/**
 * Locates the targetPackage within the cachePath and loads the set of JSON files into FHIRDefs
 * @param {string} cachePath - The path to the directory containing cached packages
 * @param {string} targetPackage - The name of the package we are trying to load
 * @param {FHIRDefinitions} FHIRDefs - The FHIRDefinitions object to load defs into
 * @returns {string} the name of the loaded package if successful
 */
export function loadFromPath(
  cachePath: string,
  targetPackage: string,
  FHIRDefs: FHIRDefinitions
): string {
  if (FHIRDefs.packages.indexOf(targetPackage) < 0) {
    const originalSize = FHIRDefs.size();
    const packages = fs.existsSync(cachePath) ? fs.readdirSync(cachePath) : [];
    const cachedPackage = packages.find(packageName => packageName.toLowerCase() === targetPackage);
    if (cachedPackage) {
      const files = fs.readdirSync(path.join(cachePath, cachedPackage, 'package'));
      for (const file of files) {
        if (file.endsWith('.json')) {
          const def = JSON.parse(
            fs.readFileSync(path.join(cachePath, cachedPackage, 'package', file), 'utf-8').trim()
          );
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

/**
 * Loads a "supplemental" FHIR package other than the primary FHIR version being used. This is
 * needed to support extensions for converting between versions (e.g., "implied" extensions).
 * The definitions from the supplemental FHIR package are not loaded into the main set of
 * definitions, but rather, are loaded into their own private FHIRDefinitions instance accessible
 * within the primary FHIRDefinitions instance passed into this function.
 * @param fhirPackage - the FHIR package to load in the format {packageId}#{version}
 * @param defs - the FHIRDefinitions object to load the supplemental FHIR defs into
 * @returns Promise<void> promise that always resolves successfully (even if there is an error)
 */
export async function loadSupplementalFHIRPackage(
  fhirPackage: string,
  defs: FHIRDefinitions
): Promise<void> {
  const supplementalDefs = new FHIRDefinitions(true);
  const [fhirPackageId, fhirPackageVersion] = fhirPackage.split('#');
  // Testing Hack: Use exports.loadDependency instead of loadDependency so that this function
  // calls the mocked loadDependency in unit tests.  In normal (non-test) use, this should
  // have no negative effects.
  return exports
    .loadDependency(fhirPackageId, fhirPackageVersion, supplementalDefs)
    .then((def: FHIRDefinitions) => defs.addSupplementalFHIRDefinitions(fhirPackage, def))
    .catch((e: Error) => {
      logger.error(`Failed to load supplemental FHIR package ${fhirPackage}: ${e.message}`);
    });
}

/**
 * Takes a date in format YYYYMMDDHHmmss and converts to YYYY-MM-DDTHH:mm:ss
 * @param {string} date - The date to format
 * @returns {string} the formatted date
 */
function formatDate(date: string): string {
  return date
    ? date.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
    : '';
}
