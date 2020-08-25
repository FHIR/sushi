import path from 'path';
import { escapeRegExp } from 'lodash';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { loadConfigurationFromIgResource } from '../../src/import';

describe('loadConfigurationFromIgResource', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should extract a configuration pointed to by an ig.ini file', () => {
    // Note that the potentially valid IG at ig-JSON-with-ini/input/ImplementationGuide.json
    // is ignored in favor of the one pointed to by ig.ini
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-with-ini', 'fsh');
    const config = loadConfigurationFromIgResource(inputPath);
    expect(config).toEqual({ canonical: 'http://example.org', FSHOnly: true, fhirVersion: [] });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(
          path.join(inputPath, '..', 'sneaky-input', 'ImplementationGuide.json')
        )}`
      )
    );
  });

  it('should extract a configuration with only a url', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-only-url', 'fsh');
    const config = loadConfigurationFromIgResource(inputPath);
    expect(config).toEqual({ canonical: 'http://example.org', FSHOnly: true, fhirVersion: [] });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should extract a configuration with a url and dependencies', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON', 'fsh');
    const config = loadConfigurationFromIgResource(inputPath);
    expect(config).toEqual({
      canonical: 'http://example.org',
      FSHOnly: true,
      dependencies: [
        { packageId: 'foo.bar', version: '1.2.3' },
        { packageId: 'bar.foo', version: 'current' }
      ],
      fhirVersion: ['4.0.1']
    });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should extract an XML configuration with a url and dependencies', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-XML', 'fsh');
    const config = loadConfigurationFromIgResource(inputPath);
    expect(config).toEqual({
      canonical: 'http://example.org',
      FSHOnly: true,
      dependencies: [
        { packageId: 'foo.bar', version: '1.2.3' },
        { packageId: 'bar.foo', version: 'current' }
      ],
      fhirVersion: ['4.0.1']
    });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.xml'))}`
      )
    );
  });

  it('should find the ImplementationGuide JSON file even when other files are present', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-other-files', 'fsh');
    const config = loadConfigurationFromIgResource(inputPath);
    expect(config).toEqual({ canonical: 'http://example.org', FSHOnly: true, fhirVersion: [] });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should return null when there are two potentially valid IG files', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-and-ig-XML', 'fsh');
    expect(loadConfigurationFromIgResource(inputPath)).toBeNull();
  });

  it('should return null when there is no ImplementationGuide JSON with a url', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-no-url', 'fsh');
    expect(loadConfigurationFromIgResource(inputPath)).toBeNull();
  });

  it('should return null when there is no ImplementationGuide JSON', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-no-ig-JSON', 'fsh');
    expect(loadConfigurationFromIgResource(inputPath)).toBeNull();
  });

  it('should return null when the input path does not exist', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'fake-path', 'fsh');
    expect(loadConfigurationFromIgResource(inputPath)).toBeNull();
  });
});
