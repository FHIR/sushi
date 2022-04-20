import path from 'path';
import fs from 'fs-extra';
import { execFile } from 'child_process';
import util from 'util';
import {
  InvalidHookError,
  MissingPluginError,
  QuestionableNpmNameError,
  MissingInitializeFunctionError
} from '../errors';
import { PluginConfiguration } from '../fshtypes';
import { logger } from './FSHLogger';

export const AVAILABLE_HOOKS = [
  'beforeFillTank',
  'beforeLoadCustomResources',
  'afterLoadCustomResources',
  'afterExportFHIR'
];

export class PluginManager {
  static hooks = new Map<string, ((...args: any) => any)[]>();

  static async processPluginConfiguration(
    plugins: PluginConfiguration[],
    pluginBasePath: string
  ): Promise<void> {
    for (const plugin of plugins) {
      try {
        if (plugin.version != null) {
          // this is a plugin that can be acquired from npm.
          // it might already be installed, so check for that first.
          const existingInstallationPath = path.join(pluginBasePath, 'node_modules', plugin.name);
          let shouldPerformInstallation = true;
          if (fs.existsSync(path.join(existingInstallationPath, 'package.json'))) {
            // check the version number in package.json
            const packageContents = fs.readJsonSync(
              path.join(existingInstallationPath, 'package.json')
            );
            if (packageContents.version === plugin.version) {
              shouldPerformInstallation = false;
            }
          }
          if (shouldPerformInstallation) {
            await PluginManager.installFromNpm(pluginBasePath, `${plugin.name}@${plugin.version}`);
          }
          PluginManager.loadFromFilesystem([existingInstallationPath], plugin.name, plugin.args);
        } else {
          // this is a plugin managed on the local filesystem.
          // it may be at the base path, or in the node_modules directory
          PluginManager.loadFromFilesystem(
            [
              path.join(pluginBasePath, plugin.name),
              path.join(pluginBasePath, 'node_modules', plugin.name)
            ],
            plugin.name,
            plugin.args
          );
        }
      } catch (err) {
        logger.error(`Couldn't load plugin ${plugin.name}: ${err.message}`);
      }
    }
  }

  // a small test for name safety, based on typical naming patterns for npm packages
  static isNameNpmSafe(name: string): boolean {
    return /^[\w\d@/._-]+$/.test(name);
  }

  static async installFromNpm(installPath: string, installTarget: string) {
    if (PluginManager.isNameNpmSafe(installTarget)) {
      fs.ensureDirSync(installPath);
      const installationResult = await util.promisify(execFile)(
        'npm',
        ['install', '--prefix', '.', installTarget],
        {
          cwd: installPath,
          shell: true
        }
      );
      if (installationResult.stderr.length > 0) {
        throw new Error(installationResult.stderr);
      } else {
        logger.info(`Installed plugin ${installTarget}`);
      }
    } else {
      throw new QuestionableNpmNameError();
    }
  }

  static loadFromFilesystem(basePaths: string[], name: string, pluginArgs: any[] = []) {
    for (const basePath of basePaths) {
      const pluginPath = path.resolve(basePath);
      if (fs.existsSync(pluginPath) && fs.statSync(pluginPath).isDirectory()) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pluginModule = require(pluginPath);
        // does the module actually have an initialize function?
        if (pluginModule.initialize != null && typeof pluginModule.initialize === 'function') {
          pluginModule.initialize(PluginManager.registerHook, ...pluginArgs);
        } else {
          throw new MissingInitializeFunctionError();
        }
        logger.info(`Initialized plugin: ${name}`);
        return;
      }
    }
    throw new MissingPluginError(name);
  }

  static registerHook(hook: string, action: (...args: any) => any): void {
    if (AVAILABLE_HOOKS.includes(hook)) {
      if (!PluginManager.hooks.has(hook)) {
        PluginManager.hooks.set(hook, []);
      }
      PluginManager.hooks.get(hook).push(action);
    } else {
      throw new InvalidHookError(hook, AVAILABLE_HOOKS);
    }
  }
}
