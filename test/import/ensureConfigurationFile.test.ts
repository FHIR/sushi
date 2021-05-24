import path from 'path';
import temp from 'temp';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { ensureConfiguration } from '../../src/import';

describe('ensureConfigurationFile', () => {
  // Track temp files/folders for cleanup
  temp.track();

  afterAll(() => {
    temp.cleanupSync();
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should return the path to a pre-existing sushi-config.yaml', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-sushi-config-yaml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yaml'));
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    expect(loggerSpy.getAllLogs('info')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('info')).toMatch('Using configuration file:');
  });

  it('should return the path to a pre-existing sushi-config.yml', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-sushi-config-yml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(path.join(tank, 'sushi-config.yml'));
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    expect(loggerSpy.getAllLogs('info')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('info')).toMatch('Using configuration file:');
  });

  it('should log an error and not return a path if there is a pre-existing config.yaml (deprecated)', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-config-yaml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(undefined);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Use of config\.yaml is deprecated/);
  });

  it('should log an error and not return a path if there is a pre-existing config.yml (deprecated', () => {
    const tank = path.join(__dirname, 'fixtures', 'existing-config-yml');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBe(undefined);
    expect(loggerSpy.getAllLogs('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(/Use of config\.yml is deprecated/);
  });

  it('should return undefined on an empty folder (no config file)', () => {
    const tank = temp.mkdirSync('sushi-test');
    const configPath = ensureConfiguration(tank);
    expect(configPath).toBeUndefined();
    expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    expect(loggerSpy.getAllLogs('info')).toHaveLength(0);
  });
});
