import { loadFromPath } from 'fhir-package-loader';
import { FSHDocument, FSHTank } from '../../src/import';
import { Profile, Instance } from '../../src/fshtypes';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { Package } from '../../src/export';
import { StructureDefinition } from '../../src/fhirtypes';
import { MasterFisher } from '../../src/utils/MasterFisher';
import { loggerSpy } from '../testhelpers/loggerSpy';
import path from 'path';
import { minimalConfig } from './minimalConfig';
import { cloneDeep } from 'lodash';

describe('MasterFisher', () => {
  let fisher: MasterFisher;
  let defs: FHIRDefinitions;
  beforeAll(() => {
    const doc1 = new FSHDocument('doc.fsh');
    doc1.aliases.set('TankProfile1', 'http://hl7.org/fhir/us/minimal/StructureDefinition/prf1');
    doc1.aliases.set('PkgProfile3', 'http://hl7.org/fhir/us/minimal/StructureDefinition/profile3');
    doc1.aliases.set('FHIRPatient', 'http://hl7.org/fhir/StructureDefinition/Patient');
    doc1.profiles.set('Profile1', new Profile('Profile1'));
    doc1.profiles.get('Profile1').id = 'prf1';
    doc1.profiles.get('Profile1').parent = 'Procedure';
    doc1.profiles.set('Profile2', new Profile('Profile2'));
    doc1.profiles.get('Profile2').parent = 'bp';
    doc1.profiles.set('Organization', new Profile('Organization'));
    doc1.profiles.get('Organization').id = 'my-org';
    doc1.profiles.get('Organization').parent =
      'http://hl7.org/fhir/StructureDefinition/Organization';
    doc1.profiles.set(
      'Practitioner',
      new Profile('Practitioner').withFile('Practitioner.fsh').withLocation([2, 8, 4, 28])
    );
    doc1.profiles.get('Practitioner').id = 'my-dr';
    doc1.profiles.get('Practitioner').parent = 'Practitioner';
    doc1.instances.set('Instance1', new Instance('Instance1'));
    doc1.instances.get('Instance1').id = 'inst1';
    doc1.instances.get('Instance1').instanceOf = 'Profile1';
    doc1.instances.set('InlineInstance', new Instance('InlineInstance'));
    doc1.instances.get('InlineInstance').id = 'inline-instance';
    doc1.instances.get('InlineInstance').instanceOf = 'Profile1';
    doc1.instances.get('InlineInstance').usage = 'Inline';
    const tank = new FSHTank([doc1], minimalConfig);

    const pkg = new Package(tank.config);
    const profile3 = new StructureDefinition();
    profile3.name = 'Profile3';
    profile3.id = 'profile3';
    profile3.type = 'Condition';
    profile3.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/profile3';
    profile3.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile3.fhirVersion = '4.0.1';
    const profile4 = new StructureDefinition();
    profile4.name = 'MyVitalSigns';
    profile4.id = 'vitalsigns';
    profile4.type = 'Observation';
    profile4.url = 'http://hl7.org/fhir/us/minimal/StructureDefinition/vitalsigns';
    profile4.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Observation';
    profile4.fhirVersion = '4.0.1';
    pkg.profiles.push(profile3, profile4);

    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);

    fisher = new MasterFisher(tank, defs, pkg);
  });

  it('should correctly determine its FHIR version from a loaded StructureDefinition', () => {
    expect(fisher.defaultFHIRVersion).toBe('4.0.1');
  });

  it('should fallback to the config when it cannot determine its FHIR version from a loaded StructureDefinition', () => {
    const r4bConfig = cloneDeep(minimalConfig);
    r4bConfig.fhirVersion = ['4.3.0'];
    const r4bTank = new FSHTank([new FSHDocument('doc.fsh')], r4bConfig);
    const r4bFisher = new MasterFisher(r4bTank, new FHIRDefinitions(), new Package(r4bTank.config));
    expect(r4bFisher.defaultFHIRVersion).toBe('4.3.0');
  });

  it('should find a profile that is only in the tank', () => {
    const result = fisher.fishForFHIR('Profile1');
    expect(result).toBeUndefined(); // NOTE: It is only in the tank and the tank does not support FHIR

    const resultMD = fisher.fishForMetadata('Profile1');
    expect(resultMD).toEqual({
      id: 'prf1',
      name: 'Profile1',
      sdType: 'Procedure',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/prf1',
      parent: 'Procedure',
      resourceType: 'StructureDefinition'
    });
  });

  it('should find the correct sdType for a profile of a profile that is only in the tank', () => {
    const result = fisher.fishForFHIR('Profile2');
    expect(result).toBeUndefined(); // NOTE: It is only in the tank and the tank does not support FHIR

    const resultMD = fisher.fishForMetadata('Profile2');
    expect(resultMD).toEqual({
      id: 'Profile2',
      name: 'Profile2',
      sdType: 'Observation',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/Profile2',
      parent: 'bp',
      resourceType: 'StructureDefinition'
    });
  });

  it('should log an error when encountering circular dependencies when determining sdType', () => {
    const result = fisher.fishForFHIR('my-dr');
    expect(result).toBeUndefined(); // NOTE: It is only in the tank and the tank does not support FHIR

    // This next line causes the fisher to have to look up the parent chain to find the sdType.  This
    // will cause an error because Practitioner basically declares itself as its own parent.
    const resultMD = fisher.fishForMetadata('my-dr');
    expect(loggerSpy.getLastMessage()).toMatch(
      /Circular dependency .* Practitioner < Practitioner/
    );
    expect(loggerSpy.getLastMessage()).toMatch(/File: Practitioner\.fsh.*Line: 2 - 4\D*/s);
    expect(resultMD).toEqual({
      id: 'my-dr',
      name: 'Practitioner',
      sdType: undefined,
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-dr',
      parent: 'Practitioner',
      resourceType: 'StructureDefinition'
    });
  });

  it('should find a profile that is only in the package (not likely, but good to test)', () => {
    const result = fisher.fishForFHIR('Profile3');
    expect(result.id).toBe('profile3');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('Profile3');
    expect(resultMD).toEqual({
      id: 'profile3',
      name: 'Profile3',
      sdType: 'Condition',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/profile3',
      parent: 'http://hl7.org/fhir/StructureDefinition/Condition',
      resourceType: 'StructureDefinition'
    });
  });

  it('should find a profile that is only in the FHIR definitions', () => {
    const result = fisher.fishForFHIR('Patient');
    expect(result.id).toBe('Patient');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('Patient');
    expect(resultMD).toEqual({
      abstract: false,
      id: 'Patient',
      name: 'Patient',
      sdType: 'Patient',
      url: 'http://hl7.org/fhir/StructureDefinition/Patient',
      version: '4.0.1',
      parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
      resourceType: 'StructureDefinition'
    });
  });

  it('should return the profile from the package when it exists in the package and FHIR definitions', () => {
    const result = fisher.fishForFHIR('vitalsigns');
    expect(result.name).toBe('MyVitalSigns');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('vitalsigns');
    expect(resultMD).toEqual({
      id: 'vitalsigns',
      name: 'MyVitalSigns',
      sdType: 'Observation',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/vitalsigns',
      parent: 'http://hl7.org/fhir/StructureDefinition/Observation',
      resourceType: 'StructureDefinition'
    });
  });

  it('should return a profile that is predefined when it also exists in the package', () => {
    // Mark vital signs as predefined
    const fhirDefinedVitalSigns = defs.fishForFHIR('vitalsigns');
    defs.addPredefinedResource('', defs.fishForFHIR('vitalsigns'));

    // Result should match the fhir defined version, not our defined version
    const result = fisher.fishForFHIR('vitalsigns');
    expect(result.name).toBe(fhirDefinedVitalSigns.name);

    const resultMD = fisher.fishForMetadata('vitalsigns');
    expect(resultMD).toEqual({
      abstract: false,
      id: fhirDefinedVitalSigns.id,
      name: fhirDefinedVitalSigns.name,
      sdType: fhirDefinedVitalSigns.type,
      url: fhirDefinedVitalSigns.url,
      version: fhirDefinedVitalSigns.version,
      parent: fhirDefinedVitalSigns.baseDefinition,
      resourceType: 'StructureDefinition'
    });
    defs.resetPredefinedResources();
  });

  it('should find an Instance that is only in the Tank', () => {
    const result = fisher.fishForFHIR('Instance1');
    expect(result).toBeUndefined();

    const resultMD = fisher.fishForMetadata('Instance1');
    expect(resultMD).toEqual({
      id: 'inst1',
      name: 'Instance1',
      instanceUsage: 'Example',
      resourceType: 'Procedure',
      sdType: undefined,
      url: 'http://hl7.org/fhir/us/minimal/Procedure/inst1'
    });
  });

  it('should find an inline Instance that is only in the Tank', () => {
    const result = fisher.fishForFHIR('InlineInstance');
    expect(result).toBeUndefined();

    const resultMD = fisher.fishForMetadata('InlineInstance');
    expect(resultMD).toEqual({
      id: 'inline-instance',
      name: 'InlineInstance',
      instanceUsage: 'Inline',
      resourceType: 'Procedure',
      sdType: undefined
    });
  });

  it('should not return the FHIR def for a resource if there is a profile w/ the same name in the tank', () => {
    const result = fisher.fishForFHIR('Organization');
    expect(result).toBeUndefined();

    const resultMD = fisher.fishForMetadata('Organization');
    expect(resultMD).toEqual({
      id: 'my-org',
      name: 'Organization',
      sdType: 'Organization',
      url: 'http://hl7.org/fhir/us/minimal/StructureDefinition/my-org',
      parent: 'http://hl7.org/fhir/StructureDefinition/Organization',
      resourceType: 'StructureDefinition'
    });
  });

  it('should support fishing using aliases when fishing the Tank', () => {
    const result = fisher.fishForFHIR('TankProfile1');
    expect(result).toBeUndefined(); // the tank doesn't return FHIR

    const resultMD = fisher.fishForMetadata('TankProfile1');
    expect(resultMD.id).toBe('prf1');
  });

  it('should support fishing using aliases when fishing the Pkg', () => {
    const result = fisher.fishForFHIR('PkgProfile3');
    expect(result.id).toBe('profile3');

    const resultMD = fisher.fishForMetadata('PkgProfile3');
    expect(resultMD.id).toBe('profile3');
  });

  it('should support fishing using aliases when fishing the FHIR definitions', () => {
    const result = fisher.fishForFHIR('FHIRPatient');
    expect(result.id).toBe('Patient');

    const resultMD = fisher.fishForMetadata('FHIRPatient');
    expect(resultMD.id).toBe('Patient');
  });

  it('should return undefined when fishing for something that is not in any locations', () => {
    const result = fisher.fishForFHIR('Foo');
    expect(result).toBeUndefined();

    const resultMD = fisher.fishForMetadata('Foo');
    expect(resultMD).toBeUndefined();
  });
});
