import path from 'path';
import fs from 'fs-extra';
import ini from 'ini';
import { Fhir as FHIRConverter } from 'fhir/fhir';
import { Configuration } from '../fshtypes';
import { ImplementationGuide } from '../fhirtypes';
import { logger } from '../utils';

/**
 * Attempts to find an ig resource file and extract the required configuration properties from it
 * @param igRoot - path to the root of the IG project
 * @returns {Configuration} the extracted configuration
 */
export function loadConfigurationFromIgResource(igRoot: string): Configuration | null {
  // First, look in the ig.ini file for a path to the IG resource
  let igPath: string;
  const igIniPath = path.join(igRoot, 'ig.ini');
  if (fs.existsSync(igIniPath)) {
    try {
      const igIni = ini.parse(fs.readFileSync(igIniPath, 'utf-8'));
      if (igIni.IG?.ig) {
        igPath = path.join(igRoot, igIni.IG.ig);
      }
    } catch {}
  }
  // Make a list of possible path, if ig.ini exists and points to a ig file, add just that
  // otherwise consider all files in the input folder of the ig
  const igInputPath = path.join(igRoot, 'input');
  const possibleIgPaths: string[] = [];
  if (fs.existsSync(igPath)) {
    possibleIgPaths.push(igPath);
  } else if (fs.existsSync(igInputPath)) {
    possibleIgPaths.push(...fs.readdirSync(igInputPath).map(file => path.join(igInputPath, file)));
  }
  // Go through each possible path, and check each xml/json file to see if they are an IG resource
  const fhirConverter = new FHIRConverter();
  let igResource: ImplementationGuide;
  let multipleIgs = false;
  possibleIgPaths.forEach(filePath => {
    let fileContent;
    if (path.extname(filePath) === '.json') {
      fileContent = fs.readJSONSync(filePath);
    } else if (path.extname(filePath) === '.xml') {
      fileContent = fhirConverter.xmlToObj(fs.readFileSync(filePath).toString());
    }
    if (fileContent?.resourceType === 'ImplementationGuide') {
      // If 2 possible IG resources are found, we cannot tell which to use, so return
      if (igResource != null) {
        multipleIgs = true;
        logger.error(
          'Multiple possible ImplementationGuide resources in "input" folder, so no configuration can be extracted.' +
            ' Ensure only one ImplementationGuide resource is in the "input" folder, or give the path to the desired resource in ig.ini.'
        );
      }
      igResource = fileContent;
      igPath = filePath;
    }
  });
  // Extract the configuration from the resource
  if (igResource && igResource.url && !multipleIgs) {
    logger.info(`Extracting FSHOnly configuration from ${igPath}...`);
    const config = {
      canonical: igResource.url.replace(/\/ImplementationGuide.*/, ''),
      version: igResource.version,
      fhirVersion: igResource.fhirVersion ?? [],
      dependencies: igResource.dependsOn?.filter(dep => dep.packageId && dep.version),
      FSHOnly: true,
      parameters: igResource.definition?.parameter ?? []
    };
    config.dependencies?.forEach(dep => {
      if (/[A-Z]/.test(dep.packageId)) {
        const lowercasePackageId = dep.packageId.toLowerCase();
        logger.warn(
          `Dependency ${dep.packageId} contains uppercase characters, which is discouraged. SUSHI will use ${lowercasePackageId} as the package name.`
        );
        dep.packageId = lowercasePackageId;
      }
    });
    logger.info('Extracted configuration:');
    Object.entries(config).forEach(e => {
      if (Array.isArray(e[1])) {
        e[1].forEach((sub: any, i: number) => {
          logger.info(`  ${e[0]}[${i}]: ${JSON.stringify(sub)}`);
        });
      } else {
        logger.info(`  ${e[0]}: ${JSON.stringify(e[1])}`);
      }
    });
    return config;
  }
  return null;
}
