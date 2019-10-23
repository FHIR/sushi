import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';

describe('#load()', () => {
  describe('fhir-4.0.0', () => {
    let defs: FHIRDefinitions;
    beforeAll(() => {
      defs = load('4.0.0');
    });

    it('should load base FHIR resources', () => {
      expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
      expect(defs.findResource('Condition').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Condition'
      );
      expect(defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition').id).toBe(
        'Condition'
      );
    });

    it('should load base FHIR primitive types', () => {
      expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
      expect(defs.findType('boolean').url).toBe('http://hl7.org/fhir/StructureDefinition/boolean');
      expect(defs.findType('http://hl7.org/fhir/StructureDefinition/boolean').id).toBe('boolean');
    });

    it('should load base FHIR complex types', () => {
      expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
      expect(defs.findType('Address').url).toBe('http://hl7.org/fhir/StructureDefinition/Address');
      expect(defs.findType('http://hl7.org/fhir/StructureDefinition/Address').id).toBe('Address');
    });

    it('should load base FHIR extensions', () => {
      expect(defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')).toBeTruthy();
      expect(defs.findExtension('patient-mothersMaidenName').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(
        defs.findExtension('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName').id
      ).toBe('patient-mothersMaidenName');
    });

    it('should load base FHIR value sets', () => {
      expect(defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')).toBeTruthy();
      expect(defs.findValueSet('allergyintolerance-clinical').url).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );
      expect(defs.findValueSet('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical').id).toBe(
        'allergyintolerance-clinical'
      );
    });

    it('should globally find any definition', () => {
      expect(defs.find('Condition').kind).toBe('resource');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/Condition').kind).toBe('resource');
      expect(defs.find('boolean').kind).toBe('primitive-type');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/boolean').kind).toBe(
        'primitive-type'
      );
      expect(defs.find('Address').kind).toBe('complex-type');
      expect(defs.find('http://hl7.org/fhir/StructureDefinition/Address').kind).toBe(
        'complex-type'
      );
      expect(defs.find('patient-mothersMaidenName').type).toBe('Extension');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName').type
      ).toBe('Extension');
      expect(defs.find('allergyintolerance-clinical').resourceType).toBe('ValueSet');
      expect(
        defs.find('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical').resourceType
      ).toBe('ValueSet');
    });
  });
});
