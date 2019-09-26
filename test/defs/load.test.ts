import { load } from '../../src/defs/load';
import { FHIRDefinitions } from '../../src/defs/FHIRDefinitions';

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
      expect(
        defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')
          .id
      ).toBe('Condition');
    });

    it('should load base FHIR primitive types', () => {
      expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
      expect(defs.findType('boolean').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/boolean'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/boolean').id
      ).toBe('boolean');
    });

    it('should load base FHIR complex types', () => {
      expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
      expect(defs.findType('Address').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Address'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/Address').id
      ).toBe('Address');
    });

    it('should load base FHIR extensions', () => {
      expect(
        defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')
      ).toBeTruthy();
      expect(defs.findExtension('patient-mothersMaidenName').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(
        defs.findExtension(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).id
      ).toBe('patient-mothersMaidenName');
    });

    it('should load base FHIR value sets', () => {
      expect(
        defs.allValueSets().some(r => r.id === 'allergyintolerance-clinical')
      ).toBeTruthy();
      expect(defs.findValueSet('allergyintolerance-clinical').url).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );
      expect(
        defs.findValueSet(
          'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
        ).id
      ).toBe('allergyintolerance-clinical');
    });

    it('should load US Core profiles', () => {
      expect(defs.findResource('us-core-patient').url).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(
        defs.findResource(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
        ).id
      ).toBe('us-core-patient');
    });

    it('should load US Core extensions', () => {
      expect(defs.findExtension('us-core-race').url).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
      );
      expect(
        defs.findExtension(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        ).id
      ).toBe('us-core-race');
    });

    it('should load US Core value sets', () => {
      expect(defs.findValueSet('us-core-vaccines-cvx').url).toBe(
        'http://hl7.org/fhir/us/core/ValueSet/us-core-vaccines-cvx'
      );
      expect(
        defs.findValueSet(
          'http://hl7.org/fhir/us/core/ValueSet/us-core-vaccines-cvx'
        ).id
      ).toBe('us-core-vaccines-cvx');
    });

    it('should globally find any definition', () => {
      expect(defs.find('Condition').kind).toBe('resource');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Condition').kind
      ).toBe('resource');
      expect(defs.find('boolean').kind).toBe('primitive-type');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/boolean').kind
      ).toBe('primitive-type');
      expect(defs.find('Address').kind).toBe('complex-type');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Address').kind
      ).toBe('complex-type');
      expect(defs.find('patient-mothersMaidenName').type).toBe('Extension');
      expect(
        defs.find(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).type
      ).toBe('Extension');
      expect(defs.find('allergyintolerance-clinical').resourceType).toBe(
        'ValueSet'
      );
      expect(
        defs.find('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')
          .resourceType
      ).toBe('ValueSet');
      expect(defs.find('us-core-patient').kind).toBe('resource');
      expect(
        defs.find(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
        ).kind
      ).toBe('resource');
      expect(defs.find('us-core-race').type).toBe('Extension');
      expect(
        defs.find(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        ).type
      ).toBe('Extension');
      expect(defs.find('us-core-vaccines-cvx').resourceType).toBe('ValueSet');
      expect(
        defs.find('http://hl7.org/fhir/us/core/ValueSet/us-core-vaccines-cvx')
          .resourceType
      ).toBe('ValueSet');
    });
  });

  describe('fhir-3.0.1', () => {
    let defs: FHIRDefinitions;
    beforeAll(() => {
      defs = load('3.0.1');
    });

    it('should load base FHIR resources', () => {
      expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
      expect(defs.findResource('Condition').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Condition'
      );
      expect(
        defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')
          .id
      ).toBe('Condition');
    });

    it('should load base FHIR primitive types', () => {
      expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
      expect(defs.findType('boolean').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/boolean'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/boolean').id
      ).toBe('boolean');
    });

    it('should load base FHIR complex types', () => {
      expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
      expect(defs.findType('Address').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Address'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/Address').id
      ).toBe('Address');
    });

    it('should load base FHIR extensions', () => {
      expect(
        defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')
      ).toBeTruthy();
      expect(defs.findExtension('patient-mothersMaidenName').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(
        defs.findExtension(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).id
      ).toBe('patient-mothersMaidenName');
    });

    it('should load base FHIR value sets', () => {
      expect(
        defs.allValueSets().some(r => r.id === 'allergy-clinical-status')
      ).toBeTruthy();
      expect(defs.findValueSet('allergy-clinical-status').url).toBe(
        'http://hl7.org/fhir/ValueSet/allergy-clinical-status'
      );
      expect(
        defs.findValueSet(
          'http://hl7.org/fhir/ValueSet/allergy-clinical-status'
        ).id
      ).toBe('allergy-clinical-status');
    });

    it('should load US Core profiles', () => {
      expect(defs.findResource('us-core-patient').url).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(
        defs.findResource(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
        ).id
      ).toBe('us-core-patient');
    });

    it('should load US Core extensions', () => {
      expect(defs.findExtension('us-core-race').url).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
      );
      expect(
        defs.findExtension(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        ).id
      ).toBe('us-core-race');
    });

    it('should load US Core value sets', () => {
      expect(defs.findValueSet('us-core-cvx').url).toBe(
        'http://hl7.org/fhir/us/core/ValueSet/us-core-cvx'
      );
      expect(
        defs.findValueSet('http://hl7.org/fhir/us/core/ValueSet/us-core-cvx').id
      ).toBe('us-core-cvx');
    });

    it('should globally find any definition', () => {
      expect(defs.find('Condition').kind).toBe('resource');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Condition').kind
      ).toBe('resource');
      expect(defs.find('boolean').kind).toBe('primitive-type');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/boolean').kind
      ).toBe('primitive-type');
      expect(defs.find('Address').kind).toBe('complex-type');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Address').kind
      ).toBe('complex-type');
      expect(defs.find('patient-mothersMaidenName').type).toBe('Extension');
      expect(
        defs.find(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).type
      ).toBe('Extension');
      expect(defs.find('allergy-clinical-status').resourceType).toBe(
        'ValueSet'
      );
      expect(
        defs.find('http://hl7.org/fhir/ValueSet/allergy-clinical-status')
          .resourceType
      ).toBe('ValueSet');
      expect(defs.find('us-core-patient').kind).toBe('resource');
      expect(
        defs.find(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
        ).kind
      ).toBe('resource');
      expect(defs.find('us-core-race').type).toBe('Extension');
      expect(
        defs.find(
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        ).type
      ).toBe('Extension');
      expect(defs.find('us-core-cvx').resourceType).toBe('ValueSet');
      expect(
        defs.find('http://hl7.org/fhir/us/core/ValueSet/us-core-cvx')
          .resourceType
      ).toBe('ValueSet');
    });
  });

  describe('fhir-1.0.2', () => {
    let defs: FHIRDefinitions;
    beforeAll(() => {
      defs = load('1.0.2');
    });

    it('should load base FHIR resources', () => {
      expect(defs.allResources().some(r => r.id === 'Condition')).toBeTruthy();
      expect(defs.findResource('Condition').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Condition'
      );
      expect(
        defs.findResource('http://hl7.org/fhir/StructureDefinition/Condition')
          .id
      ).toBe('Condition');
    });

    it('should load base FHIR primitive types', () => {
      expect(defs.allTypes().some(r => r.id === 'boolean')).toBeTruthy();
      expect(defs.findType('boolean').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/boolean'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/boolean').id
      ).toBe('boolean');
    });

    it('should load base FHIR complex types', () => {
      expect(defs.allTypes().some(r => r.id === 'Address')).toBeTruthy();
      expect(defs.findType('Address').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/Address'
      );
      expect(
        defs.findType('http://hl7.org/fhir/StructureDefinition/Address').id
      ).toBe('Address');
    });

    it('should load base FHIR extensions', () => {
      expect(
        defs.allExtensions().some(r => r.id === 'patient-mothersMaidenName')
      ).toBeTruthy();
      expect(defs.findExtension('patient-mothersMaidenName').url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(
        defs.findExtension(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).id
      ).toBe('patient-mothersMaidenName');
    });

    it('should load base FHIR value sets', () => {
      expect(
        defs.allValueSets().some(r => r.id === 'allergy-intolerance-status')
      ).toBeTruthy();
      expect(defs.findValueSet('allergy-intolerance-status').url).toBe(
        'http://hl7.org/fhir/ValueSet/allergy-intolerance-status'
      );
      expect(
        defs.findValueSet(
          'http://hl7.org/fhir/ValueSet/allergy-intolerance-status'
        ).id
      ).toBe('allergy-intolerance-status');
    });

    it('should load Argonaut profiles', () => {
      expect(defs.findResource('argo-patient').url).toBe(
        'http://fhir.org/guides/argonaut/StructureDefinition/argo-patient'
      );
      expect(
        defs.findResource(
          'http://fhir.org/guides/argonaut/StructureDefinition/argo-patient'
        ).id
      ).toBe('argo-patient');
    });

    it('should load Argonaut extensions', () => {
      expect(defs.findExtension('argo-race').url).toBe(
        'http://fhir.org/guides/argonaut/StructureDefinition/argo-race'
      );
      expect(
        defs.findExtension(
          'http://fhir.org/guides/argonaut/StructureDefinition/argo-race'
        ).id
      ).toBe('argo-race');
    });

    it('should load Argonaut value sets', () => {
      expect(defs.findValueSet('vacc-status').url).toBe(
        'http://fhir.org/guides/argonaut/ValueSet/vacc-status'
      );
      expect(
        defs.findValueSet(
          'http://fhir.org/guides/argonaut/ValueSet/vacc-status'
        ).id
      ).toBe('vacc-status');
    });

    it('should globally find any definition', () => {
      expect(defs.find('Condition').kind).toBe('resource');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Condition').kind
      ).toBe('resource');
      expect(defs.find('boolean').kind).toBe('datatype');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/boolean').kind
      ).toBe('datatype');
      expect(defs.find('Address').kind).toBe('datatype');
      expect(
        defs.find('http://hl7.org/fhir/StructureDefinition/Address').kind
      ).toBe('datatype');
      expect(defs.find('patient-mothersMaidenName').constrainedType).toBe(
        'Extension'
      );
      expect(
        defs.find(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
        ).constrainedType
      ).toBe('Extension');
      expect(defs.find('allergy-intolerance-status').resourceType).toBe(
        'ValueSet'
      );
      expect(
        defs.find('http://hl7.org/fhir/ValueSet/allergy-intolerance-status')
          .resourceType
      ).toBe('ValueSet');
      expect(defs.find('argo-patient').kind).toBe('resource');
      expect(
        defs.find(
          'http://fhir.org/guides/argonaut/StructureDefinition/argo-patient'
        ).kind
      ).toBe('resource');
      expect(defs.find('argo-race').constrainedType).toBe('Extension');
      expect(
        defs.find(
          'http://fhir.org/guides/argonaut/StructureDefinition/argo-race'
        ).constrainedType
      ).toBe('Extension');
      expect(defs.find('vacc-status').resourceType).toBe('ValueSet');
      expect(
        defs.find('http://fhir.org/guides/argonaut/ValueSet/vacc-status')
          .resourceType
      ).toBe('ValueSet');
    });
  });
});
