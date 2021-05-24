import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/FSHLogger';

/**
 * Checks for a sushi-config.yaml or sushi-config.yml file. If it finds one, it returns its path, otherwise it creates one
 * and then returns the new file's path.
 * @param root - the root path of the FSH Tank
 * @param allowFromScratch - create a config file from scratch even if package.json isn't found
 * @returns {string|undefined} path to the config file or undefined if it couldn't find or create one
 */
export function ensureConfiguration(root: string): string {
  const configPath = [
    path.join(root, 'sushi-config.yaml'),
    path.join(root, 'sushi-config.yml')
  ].find(fs.existsSync);
  if (configPath) {
    // The config already exists, so return it
    logger.info(`Using configuration file: ${path.resolve(configPath)}`);
  }

  const deprecatedConfigPath = [path.join(root, 'config.yaml'), path.join(root, 'config.yml')].find(
    fs.existsSync
  );
  if (deprecatedConfigPath) {
    logger.error(
      `Use of ${path.basename(
        deprecatedConfigPath
      )} is deprecated and has been removed. Please rename configuration file to "sushi-config.yaml" in order to use this configuration file.`
    );
  }

  return configPath; // Return the path to the config or undefined if it wasn't found
}
