import path from 'path';
import fs from 'fs-extra';
import ini from 'ini';
import { Fhir as FHIRConverter } from 'fhir/fhir';
import { Configuration } from '../fshtypes';
import { ImplementationGuide } from '../fhirtypes';
import { logger } from '../utils';

/**
 * Attempts to find an ig resource file and extract the required configuration properties from it
 * @param input - path to the input directory
 * @returns {Configuration} the extracted configuration
 */
export function loadConfigurationFromIgResource(input: string): Configuration | null {
  // First, look in the ig.ini file for a path to the IG resource
  let igPath: string;
  const igIniPath = path.join(input, '..', 'ig.ini');
  if (fs.existsSync(igIniPath)) {
    try {
      const igIni = ini.parse(fs.readFileSync(igIniPath, 'utf-8'));
      igPath = path.join(input, '..', igIni.ig);
    } catch {}
  }
  // Make a list of possible path, if ig.ini exists and points to a ig file, add just that
  // otherwise consider all files in the input folder of the ig
  const igInputPath = path.join(input, '..', 'input');
  const possibleIgPaths: string[] = [];
  if (fs.existsSync(igPath)) {
    possibleIgPaths.push(igPath);
  } else if (fs.existsSync(igInputPath)) {
    possibleIgPaths.push(...fs.readdirSync(igInputPath).map(file => path.join(igInputPath, file)));
  }
  // Go through each possible path, and check each xml/json file to see if they are an IG resource
  const fhirConverter = new FHIRConverter();
  let igResource: ImplementationGuide;
  possibleIgPaths.forEach(filePath => {
    let fileContent;
    if (path.extname(filePath) === '.json') {
      fileContent = fs.readJSONSync(filePath);
    } else if (path.extname(filePath) === '.xml') {
      fileContent = fhirConverter.xmlToObj(fs.readFileSync(filePath).toString());
    }
    if (fileContent?.resourceType === 'ImplementationGuide') {
      // If 2 possible IG resources are found, we cannot tell which to use, so return
      if (igResource) {
        return null;
      }
      igResource = fileContent;
      igPath = filePath;
    }
  });
  // Extract the configuration from the resource
  if (igResource && igResource.url) {
    logger.info(`Extracting FSHOnly configuration from ${igPath}.`);
    return {
      canonical: igResource.url.replace(/\/ImplementationGuide.*/, ''),
      FSHOnly: true,
      dependencies: igResource.dependsOn?.filter(dep => dep.packageId && dep.version),
      fhirVersion: igResource.fhirVersion ?? []
    };
  }
  return null;
}
