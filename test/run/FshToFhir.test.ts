import { InMemoryVirtualPackage } from 'fhir-package-loader';
import { getLocalVirtualPackages, loggerSpy, testDefsPath } from '../testhelpers';
import { logger, logMessage } from '../../src/utils/';
import { fshToFhir } from '../../src/run';
import * as processing from '../../src/utils/Processing';
import { Configuration } from '../../src/fshtypes';
import { leftAlign } from '../utils/leftAlign';
import { FHIRDefinitions, R5_DEFINITIONS_NEEDED_IN_R4 } from '../../src/fhirdefs';

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

  describe('#EndToEnd', () => {
    // One of each kind of FSH entity that fshToFhir exports
    const allEntityTypesFSH = leftAlign(`
      Resource: MyResource
      * code 0..1 code "Code" "A code for the resource"

      Logical: MyLogical
      * name 1..1 string "Name" "The name of the thing"

      CodeSystem: MyCodeSystem
      * #a "A"
      * #b "B"

      ValueSet: MyValueSet
      * include codes from system MyCodeSystem

      Instance: MyPatientInstance
      InstanceOf: MyPatient
      Usage: #example
      * name.family = "Smith"

      Extension: MyExtension
      * value[x] only string

      Profile: MyPatient
      Parent: Patient
      * name MS
      `);

    const findById = (fhir: any[], id: string) => fhir.find((r: any) => r.id === id);

    beforeAll(() => {
      loadSpy.mockImplementation(async (defs: FHIRDefinitions) => {
        // Mirror loadExternalDependencies, which provides the R5 definitions that R4 projects
        // need (such as Base for logical models), then load the full set of R4 test definitions.
        const r5ForR4 = new Map<string, any>();
        R5_DEFINITIONS_NEEDED_IN_R4.forEach(def => r5ForR4.set(def.id, def));
        await defs.loadVirtualPackage(
          new InMemoryVirtualPackage({ name: 'sushi-r5forR4', version: '1.0.0' }, r5ForR4, {
            log: logMessage
          })
        );
        for (const vp of getLocalVirtualPackages(testDefsPath('r4-definitions'))) {
          await defs.loadVirtualPackage(vp);
        }
      });
    });

    afterAll(() => {
      loadSpy.mockImplementation(() => {
        return Promise.resolve();
      });
    });

    it('should convert every exportable FSH entity type into FHIR', async () => {
      const results = await fshToFhir(allEntityTypesFSH);
      expect(results.errors).toHaveLength(0);
      // Resources outside the core FHIR namespace always produce a conformance warning
      expect(results.warnings).toHaveLength(1);
      expect(results.warnings[0].message).toMatch(/non-conformant Resource definitions/);
      expect(results.fhir).toHaveLength(7);

      const profile = findById(results.fhir, 'MyPatient');
      expect(profile.resourceType).toBe('StructureDefinition');
      expect(profile.url).toBe('http://example.org/StructureDefinition/MyPatient');
      expect(profile.kind).toBe('resource');
      expect(profile.type).toBe('Patient');
      expect(profile.derivation).toBe('constraint');
      expect(profile.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Patient');

      const extension = findById(results.fhir, 'MyExtension');
      expect(extension.resourceType).toBe('StructureDefinition');
      expect(extension.url).toBe('http://example.org/StructureDefinition/MyExtension');
      expect(extension.kind).toBe('complex-type');
      expect(extension.type).toBe('Extension');
      expect(extension.derivation).toBe('constraint');
      expect(extension.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Extension');
      const extensionValue = extension.differential.element.find(
        (e: any) => e.id === 'Extension.value[x]'
      );
      expect(extensionValue.type).toEqual([{ code: 'string' }]);

      const logical = findById(results.fhir, 'MyLogical');
      expect(logical.resourceType).toBe('StructureDefinition');
      expect(logical.url).toBe('http://example.org/StructureDefinition/MyLogical');
      expect(logical.kind).toBe('logical');
      expect(logical.type).toBe('http://example.org/StructureDefinition/MyLogical');
      expect(logical.derivation).toBe('specialization');
      expect(logical.baseDefinition).toBe('http://hl7.org/fhir/StructureDefinition/Base');

      const resource = findById(results.fhir, 'MyResource');
      expect(resource.resourceType).toBe('StructureDefinition');
      expect(resource.url).toBe('http://example.org/StructureDefinition/MyResource');
      expect(resource.kind).toBe('resource');
      expect(resource.type).toBe('MyResource');
      expect(resource.derivation).toBe('specialization');
      expect(resource.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );

      expect(findById(results.fhir, 'MyPatientInstance')).toEqual({
        resourceType: 'Patient',
        id: 'MyPatientInstance',
        meta: { profile: ['http://example.org/StructureDefinition/MyPatient'] },
        name: [{ family: 'Smith' }]
      });

      const valueSet = findById(results.fhir, 'MyValueSet');
      expect(valueSet.resourceType).toBe('ValueSet');
      expect(valueSet.url).toBe('http://example.org/ValueSet/MyValueSet');
      expect(valueSet.compose.include).toEqual([
        { system: 'http://example.org/CodeSystem/MyCodeSystem' }
      ]);

      const codeSystem = findById(results.fhir, 'MyCodeSystem');
      expect(codeSystem.resourceType).toBe('CodeSystem');
      expect(codeSystem.url).toBe('http://example.org/CodeSystem/MyCodeSystem');
      expect(codeSystem.content).toBe('complete');
      expect(codeSystem.concept).toEqual([
        { code: 'a', display: 'A' },
        { code: 'b', display: 'B' }
      ]);
    });

    it('should apply the canonical and version options to the exported artifacts', async () => {
      const results = await fshToFhir(allEntityTypesFSH, {
        canonical: 'http://custom.org/fhir',
        version: '1.2.3'
      });
      expect(results.errors).toHaveLength(0);

      ['MyPatient', 'MyExtension', 'MyLogical', 'MyResource'].forEach(id => {
        const structDef = findById(results.fhir, id);
        expect(structDef.url).toBe(`http://custom.org/fhir/StructureDefinition/${id}`);
        expect(structDef.version).toBe('1.2.3');
      });

      const valueSet = findById(results.fhir, 'MyValueSet');
      expect(valueSet.url).toBe('http://custom.org/fhir/ValueSet/MyValueSet');
      expect(valueSet.version).toBe('1.2.3');
      expect(valueSet.compose.include).toEqual([
        { system: 'http://custom.org/fhir/CodeSystem/MyCodeSystem' }
      ]);

      const codeSystem = findById(results.fhir, 'MyCodeSystem');
      expect(codeSystem.url).toBe('http://custom.org/fhir/CodeSystem/MyCodeSystem');
      expect(codeSystem.version).toBe('1.2.3');
      expect(findById(results.fhir, 'MyPatientInstance').meta.profile).toEqual([
        'http://custom.org/fhir/StructureDefinition/MyPatient'
      ]);
    });

    it('should generate snapshots for every kind of StructureDefinition when the snapshot option is true', async () => {
      const results = await fshToFhir(allEntityTypesFSH, { snapshot: true });
      expect(results.errors).toHaveLength(0);

      ['MyPatient', 'MyExtension', 'MyLogical', 'MyResource'].forEach(id => {
        const structDef = findById(results.fhir, id);
        expect(structDef.snapshot.element.length).toBeGreaterThan(0);
      });
    });

    it('should apply Invariants and Mappings to profiles without exporting them as separate artifacts', async () => {
      const results = await fshToFhir(
        leftAlign(`
      Invariant: my-inv
      Description: "Must have a name"
      Expression: "name.exists()"
      Severity: #error

      Mapping: MyMapping
      Id: my-map
      Source: MyPatient
      Target: "http://example.org/target"
      * name -> "PID-5"

      Profile: MyPatient
      Parent: Patient
      * obeys my-inv
      `)
      );
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir).toHaveLength(1);

      const profile = results.fhir[0];
      expect(profile.id).toBe('MyPatient');
      expect(profile.mapping).toEqual([{ identity: 'my-map', uri: 'http://example.org/target' }]);
      const root = profile.differential.element.find((e: any) => e.id === 'Patient');
      expect(root.constraint).toEqual([
        {
          key: 'my-inv',
          severity: 'error',
          human: 'Must have a name',
          expression: 'name.exists()',
          source: 'http://example.org/StructureDefinition/MyPatient'
        }
      ]);
      const name = profile.differential.element.find((e: any) => e.id === 'Patient.name');
      expect(name.mapping).toEqual([{ identity: 'my-map', map: 'PID-5' }]);
    });

    it('should resolve Aliases and RuleSets that are defined in a different input', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Alias: $SCT = http://snomed.info/sct

      RuleSet: ActiveStatus
      * ^status = #active
      `),
        leftAlign(`
      Profile: MyObservation
      Parent: Observation
      * insert ActiveStatus
      * code = $SCT#12345 "Example code"
      `)
      ]);
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir).toHaveLength(1);

      const profile = results.fhir[0];
      expect(profile.status).toBe('active');
      const code = profile.differential.element.find((e: any) => e.id === 'Observation.code');
      expect(code.patternCodeableConcept).toEqual({
        coding: [{ system: 'http://snomed.info/sct', code: '12345', display: 'Example code' }]
      });
    });

    it('should export the valid inputs when another input contains syntax errors', async () => {
      const results = await fshToFhir([
        leftAlign(`
      Profile: BrokenPatient
      Parent Patient
      `),
        leftAlign(`
      Profile: MyPatient
      Parent: Patient
      * name MS
      `)
      ]);
      expect(results.errors).toHaveLength(2);
      expect(results.errors[0].message).toMatch(/mismatched input 'Parent'/);
      expect(results.errors[0].input).toBe('Input_0');
      expect(results.errors[1].message).toMatch(
        /The definition for BrokenPatient does not include a Parent/
      );
      expect(results.errors[1].input).toBe('Input_0');
      expect(results.fhir.map((r: any) => r.id)).toEqual(['MyPatient']);
    });

    it('should not carry errors or warnings over from a previous call', async () => {
      const failed = await fshToFhir('Profile: MyPatient\nParent: FakeProfile');
      expect(failed.errors).toHaveLength(1);

      const results = await fshToFhir('Profile: MyPatient\nParent: Patient');
      expect(results.errors).toHaveLength(0);
      expect(results.warnings).toHaveLength(0);
      expect(results.fhir.map((r: any) => r.id)).toEqual(['MyPatient']);
    });
  });
});
