import { getLocalVirtualPackages, loggerSpy, testDefsPath } from '../testhelpers';
import { logger } from '../../src/utils/';
import { fshToFhir } from '../../src/run';
import * as processing from '../../src/utils/Processing';
import { Configuration } from '../../src/fshtypes';
import { leftAlign } from '../utils/leftAlign';
import { FHIRDefinitions } from '../../src/fhirdefs';

describe('#FshToFhir', () => {
  let loadSpy: jest.SpyInstance;
  let defaultConfig: Configuration;

  beforeAll(() => {
    loadSpy = jest.spyOn(processing, 'loadExternalDependencies').mockResolvedValue();
    defaultConfig = {
      canonical: 'http://example.org',
      FSHOnly: true,
      fhirVersion: ['4.0.1']
    };
  });

  beforeEach(() => {
    loadSpy.mockClear();
    loggerSpy.reset();
  });

  it('should use the "info" logging level by default', async () => {
    await expect(fshToFhir('')).resolves.toEqual({
      errors: [],
      warnings: [],
      fhir: []
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
    expect(results.fhir).toEqual([]);
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
    expect(results.fhir).toEqual([]);
    expect(logger.transports[0].silent).toBe(true);
  });

  it('should quit and return an error when an invalid logLevel is specified', async () => {
    // @ts-ignore
    const results = await fshToFhir('Bad FSH', { logLevel: '11' });
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toMatch(
      /Invalid logLevel: 11. Valid levels include: silly, debug, verbose, http, info, warn, error, silent/
    );
    expect(results.warnings).toHaveLength(0);
    expect(results.fhir).toBeNull();
  });

  it('should replace configuration options when specified', async () => {
    await expect(
      fshToFhir('', {
        canonical: 'http://mycanonical.org',
        dependencies: [{ packageId: 'hl7.fhir.test.core', version: '1.2.3' }],
        fhirVersion: '4.5.0',
        version: '3.2.1'
      })
    ).resolves.toEqual({
      errors: [],
      warnings: [],
      fhir: []
    });
    expect(loadSpy.mock.calls[0][1]).toEqual({
      FSHOnly: true,
      canonical: 'http://mycanonical.org',
      dependencies: [{ packageId: 'hl7.fhir.test.core', version: '1.2.3' }],
      fhirVersion: ['4.5.0'],
      version: '3.2.1'
    });
  });

  it('should load external dependencies', async () => {
    await fshToFhir('');
    expect(loadSpy.mock.calls).toHaveLength(1);
    expect(loadSpy.mock.calls[0]).toHaveLength(2);
    expect(loadSpy.mock.calls[0][0]).toBeInstanceOf(FHIRDefinitions);
    expect(loadSpy.mock.calls[0][1]).toEqual(defaultConfig);
  });

  describe('#Conversion', () => {
    beforeAll(() => {
      loadSpy.mockImplementation(async (defs: FHIRDefinitions) => {
        const vps = getLocalVirtualPackages(
          testDefsPath('r4-definitions', 'package', 'StructureDefinition-StructureDefinition.json'),
          testDefsPath('r4-definitions', 'package', 'StructureDefinition-Patient.json')
        );
        for (const vp of vps) {
          await defs.loadVirtualPackage(vp);
        }
      });
    });

    afterAll(() => {
      loadSpy.mockImplementation(() => {
        return Promise.resolve();
      });
    });

    it('should convert valid FSH into FHIR with a single input', async () => {
      const results = await fshToFhir(
        leftAlign(`
      Profile: MyPatient
      Parent: Patient
      * name MS
       `)
      );
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);

      expect(results.fhir).toHaveLength(1);
      expect(results.fhir[0].id).toBe('MyPatient');
      const name = results.fhir[0].differential.element.find((e: any) => e.id == 'Patient.name');
      expect(name.mustSupport).toBe(true);
      expect(results.fhir[0].snapshot).toBeUndefined();
    });

    it('should convert valid FSH into FHIR with several inputs', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Profile: MyPatient1
      Parent: Patient
      * name MS
       `),
        leftAlign(`
      Profile: MyPatient2
      Parent: Patient
      * gender MS
       `)
      ]);
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir).toHaveLength(2);
      expect(results.fhir[0].id).toBe('MyPatient1');
      const name = results.fhir[0].differential.element.find((e: any) => e.id == 'Patient.name');
      expect(name.mustSupport).toBe(true);
      expect(results.fhir[0].snapshot).toBeUndefined();
      expect(results.fhir[1].id).toBe('MyPatient2');
      const gender = results.fhir[1].differential.element.find(
        (e: any) => e.id == 'Patient.gender'
      );
      expect(gender.mustSupport).toBe(true);
      expect(results.fhir[1].snapshot).toBeUndefined();
    });

    it('should throw error when converting FSH into FHIR with several inputs of different entity types with duplicate names', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Profile: MyPatient1
      Parent: Patient
      * name MS
       `),
        leftAlign(`
      Instance: MyPatient1
      InstanceOf: MyPatient1
       `),
        leftAlign(`
      Profile: MyPatient2
      Parent: Patient
      * name MS
        `),
        leftAlign(`
      Instance: MyPatient2
      InstanceOf: MyPatient2
       `),
        leftAlign(`
      Profile: MyPatient3
      Parent: Patient
      * name MS
        `),
        leftAlign(`
      Instance: MyPatient4
      InstanceOf: MyPatient3
        `),
        leftAlign(`
      Instance: MyPatient5
      InstanceOf: MyPatient3
     `)
      ]);
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(1);
      expect(results.fhir).toHaveLength(7);
      expect(results.fhir[0].id).toBe('MyPatient1');
      expect(results.fhir[1].id).toBe('MyPatient2');
      expect(results.fhir[2].id).toBe('MyPatient3');
      expect(results.fhir[3].id).toBe('MyPatient1');
      expect(results.fhir[4].id).toBe('MyPatient2');
      expect(results.fhir[5].id).toBe('MyPatient4');
      expect(results.fhir[6].id).toBe('MyPatient5');

      expect(results.warnings[0].message).toMatch(
        'Detected FSH entity definitions with duplicate names. While FSH allows for duplicate ' +
          'names across entity types, they can lead to ambiguous results when referring to these ' +
          'entities by name elsewhere (e.g., in references). Consider using unique names in FSH ' +
          'declarations and assigning duplicated names using caret assignment rules instead. ' +
          'Detected duplicate names: MyPatient1, MyPatient2.'
      );
    });

    it('should not throw error when converting FSH into FHIR with several inputs of different entity types with different names', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Profile: MyPatient1
      Parent: Patient
      * name MS
       `),
        leftAlign(`
      Instance: MyPatient2
      InstanceOf: MyPatient1
       `)
      ]);
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir).toHaveLength(2);
      expect(results.fhir[0].id).toBe('MyPatient1');
      expect(results.fhir[1].id).toBe('MyPatient2');
    });

    it('should trace errors back to the originating input when multiple inputs are given', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Profile: MyPatient1
      Parent: FakeProfile
      * name MS
       `),
        leftAlign(`
      Profile: MyPatient2
      Parent: AlsoFakeProfile
      * gender MS
       `)
      ]);
      expect(results.errors).toHaveLength(2);
      expect(results.errors[0].message).toMatch(/Parent FakeProfile not found/);
      expect(results.errors[0].input).toBe('Input_0');
      expect(results.errors[1].message).toMatch(/Parent AlsoFakeProfile not found/);
      expect(results.errors[1].input).toBe('Input_1');
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir).toHaveLength(0);
      expect(results.fhir).toEqual([]);
    });

    it('should honor snapshot option = true when converting valid FSH into FHIR', async () => {
      const results = await fshToFhir(
        leftAlign(`
      Profile: MyPatient
      Parent: Patient
      * name MS
       `),
        {
          snapshot: true
        }
      );
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);

      expect(results.fhir).toHaveLength(1);
      expect(results.fhir[0].id).toBe('MyPatient');
      expect(results.fhir[0].snapshot).toBeDefined();
      const nameSnap = results.fhir[0].snapshot.element.find((e: any) => e.id == 'Patient.name');
      expect(nameSnap.mustSupport).toBe(true);
    });

    it('should honor snapshot option = false when converting valid FSH into FHIR', async () => {
      const results = await fshToFhir(
        leftAlign(`
      Profile: MyPatient
      Parent: Patient
      * name MS
       `),
        {
          snapshot: false
        }
      );
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);

      expect(results.fhir).toHaveLength(1);
      expect(results.fhir[0].id).toBe('MyPatient');
      expect(results.fhir[0].snapshot).toBeUndefined();
    });
  });
});
