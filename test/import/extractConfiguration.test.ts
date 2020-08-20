import path from 'path';
import { escapeRegExp } from 'lodash';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { extractConfiguration } from '../../src/import';

describe('extractConfiguration', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should extract a configuration with only a url', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-only-url', 'fsh');
    const config = extractConfiguration(inputPath);
    expect(config).toEqual({ canonical: 'http://example.org', FSHOnly: true });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should extract a configuration with a url and dependencies', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-with-deps', 'fsh');
    const config = extractConfiguration(inputPath);
    expect(config).toEqual({
      canonical: 'http://example.org',
      FSHOnly: true,
      dependencies: [
        { packageId: 'foo.bar', version: '1.2.3' },
        { packageId: 'bar.foo', version: 'current' }
      ]
    });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should find the ImplementationGuide JSON file even when other files are present', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-other-files', 'fsh');
    const config = extractConfiguration(inputPath);
    expect(config).toEqual({ canonical: 'http://example.org', FSHOnly: true });
    expect(loggerSpy.getLastMessage('info')).toMatch(
      new RegExp(
        `from ${escapeRegExp(path.join(inputPath, '..', 'input', 'ImplementationGuide.json'))}`
      )
    );
  });

  it('should return null when there is no ImplementationGuide JSON with a url', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-no-url', 'fsh');
    expect(extractConfiguration(inputPath)).toBeNull();
  });

  it('should return null when there is no ImplementationGuide JSON', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'ig-JSON-no-ig-JSON', 'fsh');
    expect(extractConfiguration(inputPath)).toBeNull();
  });

  it('should return null when the input path does not exist', () => {
    const inputPath = path.join(__dirname, 'fixtures', 'fake-path', 'fsh');
    expect(extractConfiguration(inputPath)).toBeNull();
  });
});
