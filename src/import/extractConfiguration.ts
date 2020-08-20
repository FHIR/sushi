import path from 'path';
import fs from 'fs-extra';
import { Configuration } from '../fshtypes';
import { ImplementationGuide } from '../fhirtypes';
import { logger } from '../utils';

/**
 * Attempts to find an ig.json file and extract the required configuration properties from it
 * @param input - path to the input directory
 * @returns {Configuration} the extracted configuration
 */
export function extractConfiguration(input: string): Configuration | null {
  const igInputPath = path.join(input, '..', 'input');
  let igJSON: ImplementationGuide;
  let igJSONPath: string;
  if (fs.existsSync(igInputPath)) {
    fs.readdirSync(igInputPath).forEach(file => {
      if (path.extname(file) === '.json') {
        const fileContent = fs.readJSONSync(path.join(igInputPath, file));
        if (fileContent.resourceType === 'ImplementationGuide') {
          igJSONPath = path.join(igInputPath, file);
          igJSON = fileContent;
        }
      }
    });
  }
  if (igJSON && igJSON.url) {
    logger.info(`Extracting configuration from ${igJSONPath}.`);
    return {
      canonical: igJSON.url.replace(/\/ImplementationGuide.*/, ''),
      FSHOnly: true,
      dependencies: igJSON.dependsOn?.filter(dep => dep.packageId && dep.version)
    };
  }
  return null;
}
