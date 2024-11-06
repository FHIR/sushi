import { FHIRDefinitions } from './FHIRDefinitions';
import fs from 'fs-extra';
import path from 'path';
import { logger, logMessage } from '../utils';
import { ImplementationGuideDefinitionParameter } from '../fhirtypes';
import { defaultPackageLoader } from 'fhir-package-loader';

/**
 * Loads custom resources defined in resourceDir into FHIRDefs
 * @param {string} resourceDir - The path to the directory containing the resource subdirs
 * @param {string} projectDir - User's specified project directory
 * @param {ImplementationGuideDefinitionParameter[]} configParameters - optional, an array of config parameters in which to
 *    determine if there are additional resource paths for predefined resource
 * @returns string[] list of paths to search for custom resources
 */
export function getLocalResourcePaths(
  resourceDir: string,
  projectDir: string = null,
  configParameters: ImplementationGuideDefinitionParameter[] = null
): string[] {
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
  const predefinedResourcePaths = pathEnds
    .map(pathEnd => path.join(resourceDir, pathEnd))
    .filter(p => fs.existsSync(p));
  if (configParameters && projectDir) {
    const pathResources = configParameters
      ?.filter(parameter => parameter.value && parameter.code === 'path-resource')
      .map(parameter => parameter.value);
    const pathResourceDirectories = pathResources
      .map(directoryPath => path.join(projectDir, directoryPath))
      .filter(directoryPath => fs.existsSync(directoryPath));
    if (pathResourceDirectories) predefinedResourcePaths.push(...pathResourceDirectories);
  }
  return [...predefinedResourcePaths];
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
  const newFPL = await defaultPackageLoader({
    log: (level: string, message: string) => {
      logMessage(level, `@@@ NEW FPL for ${fhirPackage} @@@ ${message}`);
    }
  });
  const supplementalDefs = new FHIRDefinitions(true, newFPL);
  const [fhirPackageId, fhirPackageVersion] = fhirPackage.split('#');
  await supplementalDefs.newFPL
    ?.loadPackage(fhirPackageId, fhirPackageVersion)
    .then(status => {
      logger.info(`Load status for ${fhirPackage}: ${status}`);
      defs.addSupplementalFHIRDefinitions(fhirPackage, supplementalDefs);
    })
    .catch(e => {
      logger.error(`Failed to load supplemental FHIR package ${fhirPackage}: ${e.message}`);
      if (e.stack) {
        logger.debug(e.stack);
      }
    });
}
