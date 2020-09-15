import fs from 'fs-extra';
import path from 'path';
import { loggerSpy } from '../testhelpers';
import { errorsAndWarnings, logger } from '../../src/utils/';
import { fshToFhir } from '../../src/run';
import * as utils from '../../src/utils';
import { Configuration } from '../../src/fshtypes';
import { Package } from '../../src/export';
import { FHIRDefinitions } from '../../src/fhirdefs';

describe('FshToFhir', () => {
  let loadSpy: jest.SpyInstance;
  let defaultConfig: Configuration;

  beforeAll(() => {
    loadSpy = jest.spyOn(utils, 'loadExternalDependencies').mockImplementation(() => {
      return [undefined];
    });
    defaultConfig = {
      canonical: 'http://example.org',
      FSHOnly: true,
      fhirVersion: ['4.0.1']
    };
  });

  beforeEach(() => {
    loadSpy.mockClear();
    loggerSpy.reset();
    errorsAndWarnings.reset();
  });

  it('should use the "info" logging level by default', async () => {
    await expect(fshToFhir('')).resolves.toEqual({
      errors: [],
      warnings: [],
      fhir: new Package(defaultConfig)
    });
    expect(logger.level).toBe('info');
  });

  it('should use a higher logging level when specified', async () => {
    const results = await fshToFhir('Bad FSH', { logLevel: 'error' });
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].location).toEqual({
      startColumn: 1,
      startLine: 1,
      endColumn: 3,
      endLine: 1
    });
    expect(results.errors[0].message).toMatch(/mismatched input 'Bad'/);
    expect(results.warnings).toHaveLength(0);
    expect(results.fhir).toEqual(new Package(defaultConfig));
    expect(logger.level).toBe('error');
  });

  it('should mute the logger when "silent" is specified', async () => {
    const results = await fshToFhir('Bad FSH', { logLevel: 'silent' });
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].location).toEqual({
      startColumn: 1,
      startLine: 1,
      endColumn: 3,
      endLine: 1
    });
    // errors are still tracked, even when the logger is silent
    expect(results.errors[0].message).toMatch(/mismatched input 'Bad'/);
    expect(results.warnings).toHaveLength(0);
    expect(results.fhir).toEqual(new Package(defaultConfig));
    expect(logger.transports[0].silent).toBe(true);
  });

  it('should replace configuration options when specified', async () => {
    await expect(
      fshToFhir('', {
        canonical: 'http://mycanonical.org',
        dependencies: [{ packageId: 'hl7.fhir.test.core', version: '1.2.3' }],
        version: '3.2.1'
      })
    ).resolves.toEqual({
      errors: [],
      warnings: [],
      fhir: new Package({
        canonical: 'http://mycanonical.org',
        dependencies: [{ packageId: 'hl7.fhir.test.core', version: '1.2.3' }],
        version: '3.2.1',
        FSHOnly: true,
        fhirVersion: ['4.0.1']
      })
    });
  });

  it('should load external dependencies', async () => {
    fshToFhir('');
    expect(loadSpy.mock.calls).toHaveLength(1);
    expect(loadSpy.mock.calls[0]).toEqual([new FHIRDefinitions(), defaultConfig]);
  });

  it('should convert valid FSH into FHIR', async () => {
    // Set up the FHIRDefinitions with required R4 defintiions so that we can convert from FSH
    const sd = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'package',
          'StructureDefinition-StructureDefinition.json'
        ),
        'utf-8'
      )
    );
    const patient = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          '..',
          'testhelpers',
          'testdefs',
          'package',
          'StructureDefinition-Patient.json'
        ),
        'utf-8'
      )
    );
    loadSpy.mockImplementation(defs => {
      defs.add(sd);
      defs.add(patient);
      return [undefined];
    });

    const results = await fshToFhir(
      `
    Profile: MyPatient
    Parent: Patient
    * name MS
    `
    );
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    loadSpy.mockImplementation(() => {
      return [undefined];
    });
    expect(results.fhir.profiles).toHaveLength(1);
    expect(results.fhir.profiles[0].id).toBe('MyPatient');
    const name = results.fhir.profiles[0].elements.find(e => e.id == 'Patient.name');
    expect(name.mustSupport).toBe(true);
  });
});
