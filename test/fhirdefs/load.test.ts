import { load, loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import path from 'path';

describe('#load()', () => {
  describe('fhir-4.0.1', () => {
    let defs: FHIRDefinitions;
    beforeAll(() => {
      defs = load('4.0.1');
    });

    it('should load base FHIR resources', () => {
      expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
      const conditionByID = defs.findResource('Condition');
      expect(conditionByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Condition');
      expect(conditionByID.fhirVersion).toBe('4.0.1');
      expect(defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(
        conditionByID
      );
    });

    it('should load base FHIR primitive types', () => {
      expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
      const booleanByID = defs.findType('boolean');
      expect(booleanByID.url).toBe('http://hl7.org/fhir/StructureDefinition/boolean');
      expect(booleanByID.fhirVersion).toBe('4.0.1');
      expect(defs.findType('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(booleanByID);
    });

    it('should load base FHIR complex types', () => {
      expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
      const addressByID = defs.findType('Address');
      expect(addressByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Address');
      expect(addressByID.fhirVersion).toBe('4.0.1');
      expect(defs.findType('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(addressByID);
    });

    it('should load base FHIR extensions', () => {
      expect(defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')).toBeTruthy();
      const maidenNameExtensionByID = defs.findExtension('patient-mothersMaidenName');
      expect(maidenNameExtensionByID.url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
      expect(
        defs.findExtension('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
      ).toEqual(maidenNameExtensionByID);
    });

    it('should load base FHIR value sets', () => {
      expect(defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
      const allergyStatusValueSetByID = defs.findValueSet('allergyintolerance-clinical');
      expect(allergyStatusValueSetByID.url).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(allergyStatusValueSetByID.version).toBe('4.0.1');
      expect(defs.findValueSet('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
        allergyStatusValueSetByID
      );
    });

    it('should globally find any definition', () => {
      const conditionByID = defs.find('Condition');
      expect(conditionByID.kind).toBe('resource');
      expect(conditionByID.fhirVersion).toBe('4.0.1');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(conditionByID);

      const booleanByID = defs.find('boolean');
      expect(booleanByID.kind).toBe('primitive-type');
      expect(booleanByID.fhirVersion).toBe('4.0.1');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(booleanByID);

      const addressByID = defs.find('Address');
      expect(addressByID.kind).toBe('complex-type');
      expect(addressByID.fhirVersion).toBe('4.0.1');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(addressByID);

      const maidenNameExtensionByID = defs.find('patient-mothersMaidenName');
      expect(maidenNameExtensionByID.type).toBe('Extension');
      expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
      ).toEqual(maidenNameExtensionByID);

      const allergyStatusValueSetByID = defs.find('allergyintolerance-clinical');
      expect(allergyStatusValueSetByID.resourceType).toBe('ValueSet');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(allergyStatusValueSetByID.version).toBe('4.0.1');
      expect(defs.find('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
        allergyStatusValueSetByID
      );
    });
  });
});

describe('#loadFromPath', () => {
  let result: string;
  let defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    result = loadFromPath(path.join(__dirname, './testdefs/package'), 'test#1.1.1', defs);
  });

  it('should record the name of the loaded package', () => {
    expect(defs.packages.length).toBe(1);
    expect(defs.packages[0]).toBe('test#1.1.1');
  });

  it('should load base FHIR resources', () => {
    expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
    const conditionByID = defs.findResource('Condition');
    expect(conditionByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Condition');
    expect(conditionByID.fhirVersion).toBe('4.0.1');
    expect(defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(
      conditionByID
    );
  });

  it('should load primitives from a path', () => {
    expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
    const booleanByID = defs.findType('boolean');
    expect(booleanByID.url).toBe('http://hl7.org/fhir/StructureDefinition/boolean');
    expect(booleanByID.fhirVersion).toBe('4.0.1');
    expect(defs.findType('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(booleanByID);
  });

  it('should load complex types from a path', () => {
    expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
    const addressByID = defs.findType('Address');
    expect(addressByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Address');
    expect(addressByID.fhirVersion).toBe('4.0.1');
    expect(defs.findType('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(addressByID);
  });

  it('should load extensions from a path', () => {
    expect(defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')).toBeTruthy();
    const maidenNameExtensionByID = defs.findExtension('patient-mothersMaidenName');
    expect(maidenNameExtensionByID.url).toBe(
      'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
    );
    expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
    expect(
      defs.findExtension('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
    ).toEqual(maidenNameExtensionByID);
  });

  it('should load value sets from a path', () => {
    expect(defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
    const allergyStatusValueSetByID = defs.findValueSet('allergyintolerance-clinical');
    expect(allergyStatusValueSetByID.url).toBe(
      'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
    );
    // For some reason, value sets don't specify a fhirVersion, but in this case the business
    // version is the FHIR version, so we'll verify that instead
    expect(allergyStatusValueSetByID.version).toBe('4.0.1');
    expect(defs.findValueSet('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
      allergyStatusValueSetByID
    );
  });

  it('should return undefined when loading from a non-existent path', () => {
    result = loadFromPath('./not/a/path', 'fail#2.2.2', new FHIRDefinitions());
    expect(result).toBeUndefined();
  });
});
