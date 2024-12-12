import fs from 'fs-extra';
import path from 'path';
import { DiskBasedVirtualPackage, LoadStatus } from 'fhir-package-loader';
import { ImplementationGuideDefinitionParameter } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logMessage } from '../utils';

export const PREDEFINED_PACKAGE_NAME = 'sushi-local';
export const PREDEFINED_PACKAGE_VERSION = 'LOCAL';

/**
 * Gets the local resource directory paths corresponding to the typical locations in an IG
 * as well as those configured in the IG parameter path-resource. Only those directories
 * that exist will be returned.
 * @param {string} resourceDir - The path to the directory containing the resource subdirs
 * @param {string} projectDir - User's specified project directory
 * @param {ImplementationGuideDefinitionParameter[]} configParameters - optional, an array of
 *    config parameters in which to  determine if there are additional resource paths for
 *    predefined resource
 * @returns string[] list of paths to search for predefined resources
 */
export function getPredefinedResourcePaths(
  resourceDir: string,
  projectDir: string = null,
  configParameters: ImplementationGuideDefinitionParameter[] = null
): string[] {
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
  const predefinedResourcePaths = new Set(
    pathEnds.map(pathEnd => path.join(resourceDir, pathEnd)).filter(p => fs.existsSync(p))
  );
  if (configParameters && projectDir) {
    const pathResources = configParameters
      .filter(parameter => parameter.value && parameter.code === 'path-resource')
      .map(parameter => parameter.value);
    pathResources.forEach(pathResource => {
      const fullPath = path.join(projectDir, ...pathResource.replace(/\/\*$/, '').split('/'));
      if (fs.existsSync(fullPath)) {
        predefinedResourcePaths.add(fullPath);
        // path-resource paths ending with /* should recursively include subfolders
        if (pathResource.endsWith('/*')) {
          fs.readdirSync(fullPath, { withFileTypes: true, recursive: true })
            .filter(file => file.isDirectory())
            .map(dir => path.join(dir.parentPath, dir.name))
            .forEach(p => predefinedResourcePaths.add(p));
        }
      }
    });
  }
  return Array.from(predefinedResourcePaths);
}

/**
 * Loads predefined resources from the typical locations in an IG as well as those configured
 * in the IG parameter path-resource.
 * @param {string} resourceDir - The path to the directory containing the resource subdirs
 * @param {string} projectDir - User's specified project directory
 * @param {ImplementationGuideDefinitionParameter[]} configParameters - optional, an array of
 *    config parameters in which to  determine if there are additional resource paths for
 *    predefined resource
 * @returns Promise<LoadStatus> the load status ('LOADED' or 'FAILED')
 */
export async function loadPredefinedResources(
  defs: FHIRDefinitions,
  resourceDir: string,
  projectDir: string = null,
  configParameters: ImplementationGuideDefinitionParameter[] = null
): Promise<LoadStatus> {
  const localResourcePaths = getPredefinedResourcePaths(resourceDir, projectDir, configParameters);
  const status = await defs.loadVirtualPackage(
    new DiskBasedVirtualPackage(
      { name: PREDEFINED_PACKAGE_NAME, version: PREDEFINED_PACKAGE_VERSION },
      localResourcePaths,
      {
        log: logMessage,
        allowNonResources: true, // support for logical instances
        recursive: true
      }
    )
  );
  return status;
}
