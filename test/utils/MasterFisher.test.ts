import { FSHDocument, FSHTank } from '../../src/import';
import { Profile } from '../../src/fshtypes';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Package } from '../../src/export';
import { StructureDefinition } from '../../src/fhirtypes';
import { MasterFisher } from '../../src/utils/MasterFisher';
import { loggerSpy } from '../testhelpers/loggerSpy';
import path from 'path';

describe('MasterFisher', () => {
  let fisher: MasterFisher;
  beforeAll(() => {
    const config = {
      name: 'test',
      canonical: 'http://example.org',
      version: '0.0.1'
    };

    const doc1 = new FSHDocument('doc.fsh');
    doc1.aliases.set('TankProfile1', 'http://example.org/StructureDefinition/prf1');
    doc1.aliases.set('PkgProfile3', 'http://example.org/StructureDefinition/profile3');
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
    const tank = new FSHTank([doc1], config);

    const pkg = new Package(config);
    const profile3 = new StructureDefinition();
    profile3.name = 'Profile3';
    profile3.id = 'profile3';
    profile3.type = 'Condition';
    profile3.url = 'http://example.org/StructureDefinition/profile3';
    profile3.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile3.fhirVersion = '4.0.1';
    const profile4 = new StructureDefinition();
    profile4.name = 'MyVitalSigns';
    profile4.id = 'vitalsigns';
    profile4.type = 'Observation';
    profile4.url = 'http://example.org/StructureDefinition/vitalsigns';
    profile4.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Observation';
    profile4.fhirVersion = '4.0.1';
    pkg.profiles.push(profile3, profile4);

    const defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );

    fisher = new MasterFisher(tank, defs, pkg);
  });

  it('should find a profile that is only in the tank', () => {
    const result = fisher.fishForFHIR('Profile1');
    expect(result).toBeUndefined(); // NOTE: It is only in the tank and the tank does not support FHIR

    const resultMD = fisher.fishForMetadata('Profile1');
    expect(resultMD).toEqual({
      id: 'prf1',
      name: 'Profile1',
      sdType: 'Procedure',
      url: 'http://example.org/StructureDefinition/prf1',
      parent: 'Procedure'
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
      url: 'http://example.org/StructureDefinition/Profile2',
      parent: 'bp'
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
    expect(loggerSpy.getLastMessage()).toMatch(/File: Practitioner\.fsh.*Line: 2 - 4\D/s);
    expect(resultMD).toEqual({
      id: 'my-dr',
      name: 'Practitioner',
      sdType: undefined,
      url: 'http://example.org/StructureDefinition/my-dr',
      parent: 'Practitioner'
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
      url: 'http://example.org/StructureDefinition/profile3',
      parent: 'http://hl7.org/fhir/StructureDefinition/Condition'
    });
  });

  it('should find a profile that is only in the FHIR definitions', () => {
    const result = fisher.fishForFHIR('Patient');
    expect(result.id).toBe('Patient');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('Patient');
    expect(resultMD).toEqual({
      id: 'Patient',
      name: 'Patient',
      sdType: 'Patient',
      url: 'http://hl7.org/fhir/StructureDefinition/Patient',
      parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource'
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
      url: 'http://example.org/StructureDefinition/vitalsigns',
      parent: 'http://hl7.org/fhir/StructureDefinition/Observation'
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
      url: 'http://example.org/StructureDefinition/my-org',
      parent: 'http://hl7.org/fhir/StructureDefinition/Organization'
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
