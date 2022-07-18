import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { PluginManager } from '../../src/utils';
import {
  InvalidHookError,
  MissingPluginError,
  MissingInitializeFunctionError
} from '../../src/errors';
import { PluginConfiguration } from '../../src/fshtypes';

describe('PluginManager', () => {
  let tempRoot: string;
  beforeAll(() => {
    tempRoot = temp.mkdirSync();
  });

  beforeEach(() => {
    loggerSpy.reset();
    fs.emptyDirSync(tempRoot);
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'some-plugin'),
      path.join(tempRoot, 'some-plugin')
    );
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'problem-plugin'),
      path.join(tempRoot, 'problem-plugin')
    );
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'no-init-plugin'),
      path.join(tempRoot, 'no-init-plugin')
    );
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'strange-init-plugin'),
      path.join(tempRoot, 'strange-init-plugin')
    );
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'my-async-plugin'),
      path.join(tempRoot, 'my-async-plugin')
    );
    fs.copySync(
      path.join(__dirname, 'fixtures', 'plugins', 'my-npm-plugin128'),
      path.join(tempRoot, 'node_modules', 'my-npm-plugin')
    );
  });

  afterAll(() => {
    temp.cleanupSync();
  });

  describe('#processPluginConfiguration', () => {
    let loadFromFilesystemSpy: jest.SpyInstance;
    let installFromNpmSpy: jest.SpyInstance;
    beforeAll(() => {
      loadFromFilesystemSpy = jest.spyOn(PluginManager, 'loadFromFilesystem');
      installFromNpmSpy = jest.spyOn(PluginManager, 'installFromNpm');
      // mock the installation implementation so as not to actually rely on npm during tests
      installFromNpmSpy.mockImplementation((installPath: string, installTarget: string) => {
        if (installTarget === 'your-npm-plugin@1.0.1') {
          // installing a new package
          fs.copySync(
            path.join(__dirname, 'fixtures', 'plugins', 'your-npm-plugin'),
            path.join(installPath, 'node_modules', 'your-npm-plugin')
          );
        } else if (installTarget === 'my-npm-plugin@5.7.3') {
          // changing version of an existing package
          fs.copySync(
            path.join(__dirname, 'fixtures', 'plugins', 'my-npm-plugin573'),
            path.join(installPath, 'node_modules', 'my-npm-plugin')
          );
        } else if (installTarget === '@example/scoped-plugin@2.2.2-alpha') {
          // installing a scoped plugin
          fs.copySync(
            path.join(__dirname, 'fixtures', 'plugins', 'scoped-plugin'),
            path.join(installPath, 'node_modules', '@example', 'scoped-plugin')
          );
        } else {
          throw new Error('Could not find that package on npm');
        }
      });
    });

    beforeEach(() => {
      loadFromFilesystemSpy.mockClear();
      installFromNpmSpy.mockClear();
    });

    afterAll(() => {
      loadFromFilesystemSpy.mockRestore();
      installFromNpmSpy.mockRestore();
    });

    it('should attempt to load each plugin in the configuration when they are all on the filesystem', async () => {
      const plugins: PluginConfiguration[] = [
        { name: 'some-plugin' },
        { name: 'my-npm-plugin', version: '1.2.8', args: ['oats', 'cake'] }
      ];
      await PluginManager.processPluginConfiguration(plugins, tempRoot);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loadFromFilesystemSpy).toHaveBeenCalledTimes(2);
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        1,
        [path.join(tempRoot, 'some-plugin'), path.join(tempRoot, 'node_modules', 'some-plugin')],
        'some-plugin',
        undefined
      );
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        2,
        [path.join(tempRoot, 'node_modules', 'my-npm-plugin')],
        'my-npm-plugin',
        ['oats', 'cake']
      );
    });

    it('should attempt to load each plugin in the configuration when some of them need to be installed from npm', async () => {
      const plugins: PluginConfiguration[] = [
        { name: 'your-npm-plugin', version: '1.0.1' },
        { name: 'my-npm-plugin', version: '5.7.3', args: ['coffee', 'cookie'] }
      ];
      await PluginManager.processPluginConfiguration(plugins, tempRoot);

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);

      expect(
        fs.existsSync(path.join(tempRoot, 'node_modules', 'your-npm-plugin', 'package.json'))
      ).toBeTruthy();
      const yourPackage = fs.readJsonSync(
        path.join(tempRoot, 'node_modules', 'your-npm-plugin', 'package.json')
      );
      expect(yourPackage.name).toBe('your-npm-plugin');
      expect(yourPackage.version).toBe('1.0.1');

      expect(
        fs.existsSync(path.join(tempRoot, 'node_modules', 'my-npm-plugin', 'package.json'))
      ).toBeTruthy();
      const myPackage = fs.readJsonSync(
        path.join(tempRoot, 'node_modules', 'my-npm-plugin', 'package.json')
      );
      expect(myPackage.name).toBe('my-npm-plugin');
      expect(myPackage.version).toBe('5.7.3');

      expect(installFromNpmSpy).toHaveBeenCalledTimes(2);
      expect(installFromNpmSpy).toHaveBeenNthCalledWith<[string, string]>(
        1,
        tempRoot,
        'your-npm-plugin@1.0.1'
      );
      expect(installFromNpmSpy).toHaveBeenNthCalledWith<[string, string]>(
        2,
        tempRoot,
        'my-npm-plugin@5.7.3'
      );
      expect(loadFromFilesystemSpy).toHaveBeenCalledTimes(2);
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        1,
        [path.join(tempRoot, 'node_modules', 'your-npm-plugin')],
        'your-npm-plugin',
        undefined
      );
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        2,
        [path.join(tempRoot, 'node_modules', 'my-npm-plugin')],
        'my-npm-plugin',
        ['coffee', 'cookie']
      );
    });

    it('should load plugins with a scope in their npm package name', async () => {
      const plugins: PluginConfiguration[] = [
        { name: '@example/scoped-plugin', version: '2.2.2-alpha' }
      ];
      await PluginManager.processPluginConfiguration(plugins, tempRoot);

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);

      expect(
        fs.existsSync(
          path.join(tempRoot, 'node_modules', '@example', 'scoped-plugin', 'package.json')
        )
      ).toBeTruthy();
      const scopedPackage = fs.readJsonSync(
        path.join(tempRoot, 'node_modules', '@example', 'scoped-plugin', 'package.json')
      );
      expect(scopedPackage.name).toBe('@example/scoped-plugin');
      expect(scopedPackage.version).toBe('2.2.2-alpha');

      expect(installFromNpmSpy).toHaveBeenCalledTimes(1);
      expect(installFromNpmSpy).toHaveBeenNthCalledWith<[string, string]>(
        1,
        tempRoot,
        '@example/scoped-plugin@2.2.2-alpha'
      );

      expect(loadFromFilesystemSpy).toHaveBeenCalledTimes(1);
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        1,
        [path.join(tempRoot, 'node_modules', '@example', 'scoped-plugin')],
        '@example/scoped-plugin',
        undefined
      );
    });

    it('should log an error for each filesystem-managed plugin that could not be loaded', async () => {
      const plugins: PluginConfiguration[] = [{ name: 'some-plugin' }, { name: 'problem-plugin' }];
      await PluginManager.processPluginConfiguration(plugins, tempRoot);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch("Couldn't load plugin problem-plugin");
      expect(loadFromFilesystemSpy).toHaveBeenCalledTimes(2);
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        1,
        [path.join(tempRoot, 'some-plugin'), path.join(tempRoot, 'node_modules', 'some-plugin')],
        'some-plugin',
        undefined
      );
      expect(loadFromFilesystemSpy).toHaveBeenNthCalledWith<[string[], string, any[]]>(
        2,
        [
          path.join(tempRoot, 'problem-plugin'),
          path.join(tempRoot, 'node_modules', 'problem-plugin')
        ],
        'problem-plugin',
        undefined
      );
    });

    it('should log an error when a plugin fails to be installed from npm', async () => {
      const plugins: PluginConfiguration[] = [{ name: 'bogus-npm-plugin', version: '1.0.4' }];
      await PluginManager.processPluginConfiguration(plugins, tempRoot);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch("Couldn't load plugin bogus-npm-plugin");
      expect(installFromNpmSpy).toHaveBeenCalledTimes(1);
      expect(installFromNpmSpy).toHaveBeenNthCalledWith<[string, string]>(
        1,
        tempRoot,
        'bogus-npm-plugin@1.0.4'
      );
    });
  });

  describe('#loadFromFilesystem', () => {
    beforeEach(() => {
      PluginManager.hooks = new Map<string, ((...args: any) => any)[]>();
    });

    it('should initialize a plugin when one path is provided', async () => {
      await PluginManager.loadFromFilesystem([path.join(tempRoot, 'some-plugin')], 'some-plugin');
      expect(loggerSpy.getLastMessage('info')).toBe('Initialized plugin: some-plugin');
    });

    it('should initialize a plugin when multiple paths are provided and the correct path is not the first', async () => {
      await PluginManager.loadFromFilesystem(
        [
          path.join(tempRoot, 'my-npm-plugin'),
          path.join(tempRoot, 'node_modules', 'my-npm-plugin')
        ],
        'my-npm-plugin'
      );
      expect(loggerSpy.getLastMessage('info')).toBe('Initialized plugin: my-npm-plugin');
    });

    it('should initialize a plugin that has an asynchronous initialize function', async () => {
      await PluginManager.loadFromFilesystem(
        [path.join(tempRoot, 'my-async-plugin')],
        'my-async-plugin'
      );
      expect(loggerSpy.getLastMessage('info')).toBe('Initialized plugin: my-async-plugin');
    });

    it('should throw a MissingPluginError when the plugin is missing', async () => {
      await expect(async () => {
        await PluginManager.loadFromFilesystem(
          [
            path.join(tempRoot, 'mysterious-orb'),
            path.join(tempRoot, 'node_modules', 'mysterious-orb')
          ],
          'mysterious-orb'
        );
      }).rejects.toThrowError(MissingPluginError);
    });

    it('should throw a MissingInitializeFunctionError when the module does not have an initialize function', async () => {
      await expect(async () => {
        await PluginManager.loadFromFilesystem(
          [path.join(tempRoot, 'no-init-plugin')],
          'no-init-plugin'
        );
      }).rejects.toThrowError(MissingInitializeFunctionError);
    });

    it('should throw a MissingInitializeFunctionError when the module has an initialize member that is not a function', async () => {
      await expect(async () => {
        await PluginManager.loadFromFilesystem(
          [path.join(tempRoot, 'strange-init-plugin')],
          'strange-init-plugin'
        );
      }).rejects.toThrowError(MissingInitializeFunctionError);
    });

    it('should throw when the plugin is present, but an error occurs when loading or initializing it', async () => {
      await expect(async () => {
        await PluginManager.loadFromFilesystem(
          [path.join(tempRoot, 'problem-plugin')],
          'problem-plugin',
          []
        );
      }).rejects.toThrow();
    });
  });

  describe('#registerHook', () => {
    beforeEach(() => {
      PluginManager.hooks = new Map<string, ((...args: any) => any)[]>();
    });

    it('should add functions to the available hooks', () => {
      const beforeFillTankHook = () => 7;
      const beforeLoadCustomResourcesHook = (x: number) => x * x;
      const afterExportFHIRHookA = (name: string) => name.toLowerCase();
      const afterExportFHIRHookB = () => 'cookie!';

      PluginManager.registerHook('beforeFillTank', beforeFillTankHook);
      PluginManager.registerHook('beforeLoadCustomResources', beforeLoadCustomResourcesHook);
      PluginManager.registerHook('afterExportFHIR', afterExportFHIRHookA);
      PluginManager.registerHook('afterExportFHIR', afterExportFHIRHookB);

      expect(PluginManager.hooks.get('beforeFillTank')).toEqual([beforeFillTankHook]);
      expect(PluginManager.hooks.get('beforeLoadCustomResources')).toEqual([
        beforeLoadCustomResourcesHook
      ]);
      expect(PluginManager.hooks.get('afterExportFHIR')).toEqual([
        afterExportFHIRHookA,
        afterExportFHIRHookB
      ]);
    });

    it('should throw an InvalidHookError when adding to an unavailable hook', () => {
      expect(() => {
        PluginManager.registerHook('beforeBreakfast', () => 'six impossible things');
      }).toThrowError(InvalidHookError);
    });
  });

  describe('#callHook', () => {
    beforeEach(() => {
      PluginManager.hooks = new Map<string, ((...args: any) => any)[]>();
    });

    it('should call the functions registered at the specified hook in the order they were registered', async () => {
      const firstFunction = jest.fn((records: string[]) => {
        records.push('first');
      });
      const secondFunction = jest.fn((records: string[]) => {
        records.push('second');
      });
      PluginManager.registerHook('beforeFillTank', firstFunction);
      PluginManager.registerHook('beforeFillTank', secondFunction);
      const records = ['start'];
      await PluginManager.callHook('beforeFillTank', records);
      expect(firstFunction).toHaveBeenCalledTimes(1);
      expect(secondFunction).toHaveBeenCalledTimes(1);
      expect(records).toEqual(['start', 'first', 'second']);
    });

    it('should not call functions registered at hooks other than the specified hook', async () => {
      const firstFunction = jest.fn((records: string[]) => {
        records.push('first');
      });
      const secondFunction = jest.fn((records: string[]) => {
        records.push('second');
      });
      PluginManager.registerHook('afterLoadCustomResources', firstFunction);
      PluginManager.registerHook('afterExportFHIR', secondFunction);
      const records = ['start'];
      await PluginManager.callHook('afterExportFHIR', records);
      expect(firstFunction).toHaveBeenCalledTimes(0);
      expect(secondFunction).toHaveBeenCalledTimes(1);
      expect(records).toEqual(['start', 'second']);
    });

    it('should continue calling registered functions even if one throws an error', async () => {
      const firstFunction = jest.fn(() => {
        throw new Error("Something's wrong with the G-diffuser.");
      });
      const secondFunction = jest.fn((records: string[]) => {
        records.push('second');
      });
      PluginManager.registerHook('beforeFillTank', firstFunction);
      PluginManager.registerHook('beforeFillTank', secondFunction);
      const records = ['start'];
      await PluginManager.callHook('beforeFillTank', records);
      expect(firstFunction).toHaveBeenCalledTimes(1);
      expect(firstFunction).toHaveReturnedTimes(0);
      expect(secondFunction).toHaveBeenCalledTimes(1);
      expect(secondFunction).toHaveReturnedTimes(1);
      expect(records).toEqual(['start', 'second']);
      expect(loggerSpy.getLastMessage('error')).toBe(
        "Error in plugin function at beforeFillTank hook: Something's wrong with the G-diffuser."
      );
    });
  });
});
