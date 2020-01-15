import { FSHDocument, FSHTank } from '../../src/import';
import { Profile } from '../../src/fshtypes';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import { Package } from '../../src/export';
import { StructureDefinition } from '../../src/fhirtypes';
import { MasterFisher } from '../../src/utils/MasterFisher';
import path from 'path';

describe('MasterFisher', () => {
  let fisher: MasterFisher;
  let reverseFisher: MasterFisher;
  beforeAll(() => {
    const config = {
      name: 'test',
      canonical: 'http://example.org',
      version: '0.0.1'
    };

    const doc1 = new FSHDocument('doc.fsh');
    doc1.profiles.set('Profile1', new Profile('Profile1'));
    doc1.profiles.get('Profile1').id = 'prf1';
    doc1.profiles.get('Profile1').parent = 'Observation';
    doc1.profiles.set('Profile2', new Profile('Profile2'));
    const tank = new FSHTank([doc1], config);

    const profile3 = new StructureDefinition();
    profile3.name = 'Profile3';
    profile3.id = 'profile3';
    profile3.url = 'http://example.org/StructureDefinition/profile3';
    profile3.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Condition';
    profile3.fhirVersion = '4.0.1';
    const profile4 = new StructureDefinition();
    profile4.name = 'MyVitalSigns';
    profile4.id = 'vitalsigns';
    profile4.url = 'http://example.org/StructureDefinition/vitalsigns';
    profile4.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Observation';
    profile4.fhirVersion = '4.0.1';
    const pkg = new Package([profile3, profile4], [], [], [], config);

    const defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );

    fisher = new MasterFisher(tank, pkg, defs);
    reverseFisher = new MasterFisher(defs, pkg, tank);
  });

  it('should find a profile that is only in the first fishable location', () => {
    const result = fisher.fishForFHIR('Profile1');
    expect(result).toBeUndefined(); // NOTE: It is only in the tank and the tank does not support FHIR

    const resultMD = fisher.fishForMetadata('Profile1');
    expect(resultMD).toEqual({
      id: 'prf1',
      name: 'Profile1',
      url: 'http://example.org/StructureDefinition/prf1',
      parent: 'Observation'
    });
  });

  it('should find a profile that is only in the second fishable location', () => {
    const result = fisher.fishForFHIR('Profile3');
    expect(result.id).toBe('profile3');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('Profile3');
    expect(resultMD).toEqual({
      id: 'profile3',
      name: 'Profile3',
      url: 'http://example.org/StructureDefinition/profile3',
      parent: 'http://hl7.org/fhir/StructureDefinition/Condition'
    });
  });

  it('should find a profile that is only in the third fishable location', () => {
    const result = fisher.fishForFHIR('Patient');
    expect(result.id).toBe('Patient');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('Patient');
    expect(resultMD).toEqual({
      id: 'Patient',
      name: 'Patient',
      url: 'http://hl7.org/fhir/StructureDefinition/Patient',
      parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource'
    });
  });

  it('should return the profile from the earliest location when it exists in multiple locations', () => {
    // It should return the one from the Package
    const result = fisher.fishForFHIR('vitalsigns');
    expect(result.name).toBe('MyVitalSigns');
    expect(result.fhirVersion).toBe('4.0.1');

    const resultMD = fisher.fishForMetadata('vitalsigns');
    expect(resultMD).toEqual({
      id: 'vitalsigns',
      name: 'MyVitalSigns',
      url: 'http://example.org/StructureDefinition/vitalsigns',
      parent: 'http://hl7.org/fhir/StructureDefinition/Observation'
    });

    // But if we use the reversed MasterFisher, we should get the one from FHIRDefs
    const revResult = reverseFisher.fishForFHIR('vitalsigns');
    expect(revResult.name).toBe('observation-vitalsigns');
    expect(revResult.fhirVersion).toBe('4.0.1');

    const revResultMD = reverseFisher.fishForMetadata('vitalsigns');
    expect(revResultMD).toEqual({
      id: 'vitalsigns',
      name: 'observation-vitalsigns',
      url: 'http://hl7.org/fhir/StructureDefinition/vitalsigns',
      parent: 'http://hl7.org/fhir/StructureDefinition/Observation'
    });
  });

  it('should return undefined when fishing for something that is not in any locations', () => {
    const result = fisher.fishForFHIR('Foo');
    expect(result).toBeUndefined();

    const resultMD = fisher.fishForMetadata('Foo');
    expect(resultMD).toBeUndefined();
  });
});
