import { FHIRDefinitions } from './FHIRDefinitions';
import { mergeDependency } from 'fhir-package-loader';
import fs from 'fs-extra';
import path from 'path';
import junk from 'junk';
import { logger, logMessage, getFilesRecursive } from '../utils';
import { Fhir as FHIRConverter } from 'fhir/fhir';
import { ImplementationGuideDefinitionParameter } from '../fhirtypes';

/**
 * Loads custom resources defined in resourceDir into FHIRDefs
 * @param {string} resourceDir - The path to the directory containing the resource subdirs
 * @param {string} projectDir - User's specified project directory
 * @param {ImplementationGuideDefinitionParameter[]} configParameters - optional, an array of config parameters in which to
 *    determine if there are additional resource paths for predefined resource
 * @param {FHIRDefinitions} defs - The FHIRDefinitions object to load definitions into
 */
export function loadCustomResources(
  resourceDir: string,
  projectDir: string = null,
  configParameters: ImplementationGuideDefinitionParameter[] = null,
  defs: FHIRDefinitions
): void {
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
  const predefinedResourcePaths = pathEnds.map(pathEnd => path.join(resourceDir, pathEnd));
  if (configParameters && projectDir) {
    const pathResources = configParameters
      ?.filter(parameter => parameter.value && parameter.code === 'path-resource')
      .map(parameter => parameter.value);
    const pathResourceDirectories = pathResources
      .map(directoryPath => path.join(projectDir, directoryPath))
      .filter(directoryPath => fs.existsSync(directoryPath));
    if (pathResourceDirectories) predefinedResourcePaths.push(...pathResourceDirectories);
  }
  const converter = new FHIRConverter();
  let invalidFileCount = 0;
  for (const dirPath of predefinedResourcePaths) {
    let foundSpreadsheets = false;
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
            logger.debug(`File not processed by SUSHI: ${file}`);
            continue;
          }
        } catch (e) {
          if (e.message.startsWith('Unknown resource type:')) {
            // Skip unknown FHIR resource types. When we have instances of Logical Models,
            // the resourceType will not be recognized as a known FHIR resourceType, but that's okay.
            continue;
          }
          logger.error(`Loading ${file} failed with the following error:\n${e.message}`);
          if (e.stack) {
            logger.debug(e.stack);
          }
          continue;
        }
        // All resources are added to the predefined map, so that this map can later be used to
        // access predefined resources in the IG Exporter
        defs.addPredefinedResource(file, resourceJSON);
        if (path.basename(dirPath) !== 'examples') {
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
        ? `Found ${invalidFileCount} files in input/* resource folders that were neither XML nor JSON. These files were not processed as resources by SUSHI. To see the unprocessed files in the logs, run SUSHI with the "--log-level debug" flag.`
        : `Found ${invalidFileCount} file in an input/* resource folder that was neither XML nor JSON. This file was not processed as a resource by SUSHI. To see the unprocessed file in the logs, run SUSHI with the "--log-level debug" flag.`
    );
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
  if (defs.getSupplementalFHIRDefinitions(fhirPackage) != null) {
    return;
  }
  const supplementalDefs = new FHIRDefinitions(true);
  const [fhirPackageId, fhirPackageVersion] = fhirPackage.split('#');
  return mergeDependency(fhirPackageId, fhirPackageVersion, supplementalDefs, undefined, logMessage)
    .then((def: FHIRDefinitions) => defs.addSupplementalFHIRDefinitions(fhirPackage, def))
    .catch((e: Error) => {
      logger.error(`Failed to load supplemental FHIR package ${fhirPackage}: ${e.message}`);
      if (e.stack) {
        logger.debug(e.stack);
      }
    });
}
