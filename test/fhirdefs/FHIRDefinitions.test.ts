import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import path from 'path';
import { Type } from '../../src/utils/Fishable';
import { TestFisher } from '../testhelpers';

describe('FHIRDefinitions', () => {
  let defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'test#1.1.1',
      defs
    );
    // Run the dependency resources through TestFisher to force them into the testhelpers cache
    const fisher = new TestFisher().withFHIR(defs);
    fisher.fishForFHIR('Condition');
    fisher.fishForFHIR('boolean');
    fisher.fishForFHIR('Address');
    fisher.fishForFHIR('vitalsigns');
    fisher.fishForFHIR('patient-mothersMaidenName');
    fisher.fishForFHIR('allergyintolerance-clinical', Type.ValueSet);
    fisher.fishForFHIR('allergyintolerance-clinical', Type.CodeSystem);
    fisher.fishForFHIR('w3c-provenance-activity-type');
  });

  describe('#fishForFHIR()', () => {
    it('should find base FHIR resources', () => {
      const conditionByID = defs.fishForFHIR('Condition', Type.Resource);
      expect(conditionByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Condition');
      expect(conditionByID.fhirVersion).toBe('4.0.1');
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/Condition', Type.Resource)
      ).toEqual(conditionByID);
    });

    it('should find base FHIR primitive types', () => {
      const booleanByID = defs.fishForFHIR('boolean', Type.Type);
      expect(booleanByID.url).toBe('http://hl7.org/fhir/StructureDefinition/boolean');
      expect(booleanByID.fhirVersion).toBe('4.0.1');
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/boolean', Type.Type)
      ).toEqual(booleanByID);
    });

    it('should find base FHIR complex types', () => {
      const addressByID = defs.fishForFHIR('Address', Type.Type);
      expect(addressByID.url).toBe('http://hl7.org/fhir/StructureDefinition/Address');
      expect(addressByID.fhirVersion).toBe('4.0.1');
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/Address', Type.Type)
      ).toEqual(addressByID);
    });

    it('should find base FHIR profiles', () => {
      const vitalSignsByID = defs.fishForFHIR('vitalsigns', Type.Profile);
      expect(vitalSignsByID.url).toBe('http://hl7.org/fhir/StructureDefinition/vitalsigns');
      expect(vitalSignsByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('observation-vitalsigns', Type.Profile)).toEqual(vitalSignsByID);
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/vitalsigns', Type.Profile)
      ).toEqual(vitalSignsByID);
    });

    it('should find base FHIR extensions', () => {
      const maidenNameExtensionByID = defs.fishForFHIR('patient-mothersMaidenName', Type.Extension);
      expect(maidenNameExtensionByID.url).toBe(
        'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'
      );
      expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('mothersMaidenName', Type.Extension)).toEqual(
        maidenNameExtensionByID
      );
      expect(
        defs.fishForFHIR(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
          Type.Extension
        )
      ).toEqual(maidenNameExtensionByID);
    });

    it('should find base FHIR value sets', () => {
      const allergyStatusValueSetByID = defs.fishForFHIR(
        'allergyintolerance-clinical',
        Type.ValueSet
      );
      expect(allergyStatusValueSetByID.url).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(allergyStatusValueSetByID.version).toBe('4.0.1');
      expect(defs.fishForFHIR('AllergyIntoleranceClinicalStatusCodes', Type.ValueSet)).toEqual(
        allergyStatusValueSetByID
      );
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical', Type.ValueSet)
      ).toEqual(allergyStatusValueSetByID);
    });

    it('should find base FHIR code sytems', () => {
      // Surprise!  It turns out that the AllergyIntolerance status value set and code system
      // have the same ID!
      const allergyStatusCodeSystemByID = defs.fishForFHIR(
        'allergyintolerance-clinical',
        Type.CodeSystem
      );
      expect(allergyStatusCodeSystemByID.url).toBe(
        'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
      );
      // For some reason, code systems don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(allergyStatusCodeSystemByID.version).toBe('4.0.1');
      expect(defs.fishForFHIR('AllergyIntoleranceClinicalStatusCodes', Type.CodeSystem)).toEqual(
        allergyStatusCodeSystemByID
      );
      expect(
        defs.fishForFHIR(
          'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          Type.CodeSystem
        )
      ).toEqual(allergyStatusCodeSystemByID);
    });

    it('should find definitions by the type order supplied', () => {
      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      const allergyStatusValueSetByID = defs.fishForFHIR(
        'allergyintolerance-clinical',
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(allergyStatusValueSetByID.resourceType).toBe('ValueSet');

      const allergyStatusCodeSystemByID = defs.fishForFHIR(
        'allergyintolerance-clinical',
        Type.CodeSystem,
        Type.ValueSet
      );
      expect(allergyStatusCodeSystemByID.resourceType).toBe('CodeSystem');
    });

    it('should not find the definition when the type is not requested', () => {
      const conditionByID = defs.fishForFHIR(
        'Condition',
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(conditionByID).toBeUndefined();

      const booleanByID = defs.fishForFHIR(
        'boolean',
        Type.Resource,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(booleanByID).toBeUndefined();

      const addressByID = defs.fishForFHIR(
        'Address',
        Type.Resource,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(addressByID).toBeUndefined();

      const vitalSignsProfileByID = defs.fishForFHIR(
        'vitalsigns',
        Type.Resource,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(vitalSignsProfileByID).toBeUndefined();

      const maidenNameExtensionByID = defs.fishForFHIR(
        'patient-mothersMaidenName',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(maidenNameExtensionByID).toBeUndefined();

      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      const allergyStatusValueSetByID = defs.fishForFHIR(
        'allergyintolerance-clinical',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.Instance
      );
      expect(allergyStatusValueSetByID).toBeUndefined();

      const w3cProvenanceCodeSystemByID = defs.fishForFHIR(
        'w3c-provenance-activity-type',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(w3cProvenanceCodeSystemByID).toBeUndefined();
    });

    it('should globally find any definition', () => {
      const conditionByID = defs.fishForFHIR('Condition');
      expect(conditionByID.kind).toBe('resource');
      expect(conditionByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(
        conditionByID
      );

      const booleanByID = defs.fishForFHIR('boolean');
      expect(booleanByID.kind).toBe('primitive-type');
      expect(booleanByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(
        booleanByID
      );

      const addressByID = defs.fishForFHIR('Address');
      expect(addressByID.kind).toBe('complex-type');
      expect(addressByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(
        addressByID
      );

      const vitalSignsProfileByID = defs.fishForFHIR('vitalsigns');
      expect(vitalSignsProfileByID.type).toBe('Observation');
      expect(vitalSignsProfileByID.kind).toBe('resource');
      expect(vitalSignsProfileByID.derivation).toBe('constraint');
      expect(vitalSignsProfileByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('observation-vitalsigns')).toEqual(vitalSignsProfileByID);
      expect(defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/vitalsigns')).toEqual(
        vitalSignsProfileByID
      );

      const maidenNameExtensionByID = defs.fishForFHIR('patient-mothersMaidenName');
      expect(maidenNameExtensionByID.type).toBe('Extension');
      expect(maidenNameExtensionByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('mothersMaidenName')).toEqual(maidenNameExtensionByID);
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
      ).toEqual(maidenNameExtensionByID);

      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      // When doing a non-type-specific search, we favor the ValueSet
      const allergyStatusValueSetByID = defs.fishForFHIR('allergyintolerance-clinical');
      expect(allergyStatusValueSetByID.resourceType).toBe('ValueSet');
      // For some reason, value sets don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(allergyStatusValueSetByID.version).toBe('4.0.1');
      expect(defs.fishForFHIR('AllergyIntoleranceClinicalStatusCodes')).toEqual(
        allergyStatusValueSetByID
      );
      expect(defs.fishForFHIR('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')).toEqual(
        allergyStatusValueSetByID
      );

      const w3cProvenanceCodeSystemByID = defs.fishForFHIR('w3c-provenance-activity-type');
      expect(w3cProvenanceCodeSystemByID.resourceType).toBe('CodeSystem');
      // For some reason, code systems don't specify a fhirVersion, but in this case the business
      // version is the FHIR version, so we'll verify that instead
      expect(w3cProvenanceCodeSystemByID.version).toBe('4.0.1');
      expect(defs.fishForFHIR('W3cProvenanceActivityType')).toEqual(w3cProvenanceCodeSystemByID);
      expect(defs.fishForFHIR('http://hl7.org/fhir/w3c-provenance-activity-type')).toEqual(
        w3cProvenanceCodeSystemByID
      );
    });
  });

  describe('#fishForMetadata()', () => {
    it('should find base FHIR resources', () => {
      const conditionByID = defs.fishForMetadata('Condition', Type.Resource);
      expect(conditionByID).toEqual({
        abstract: false,
        id: 'Condition',
        name: 'Condition',
        sdType: 'Condition',
        url: 'http://hl7.org/fhir/StructureDefinition/Condition',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource'
      });
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/Condition', Type.Resource)
      ).toEqual(conditionByID);
    });

    it('should find base FHIR primitive types', () => {
      const booleanByID = defs.fishForMetadata('boolean', Type.Type);
      expect(booleanByID).toEqual({
        abstract: false,
        id: 'boolean',
        name: 'boolean',
        sdType: 'boolean',
        url: 'http://hl7.org/fhir/StructureDefinition/boolean',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element'
      });
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/boolean', Type.Type)
      ).toEqual(booleanByID);
    });

    it('should find base FHIR complex types', () => {
      const addressByID = defs.fishForMetadata('Address', Type.Type);
      expect(addressByID).toEqual({
        abstract: false,
        id: 'Address',
        name: 'Address',
        sdType: 'Address',
        url: 'http://hl7.org/fhir/StructureDefinition/Address',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element'
      });
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/Address', Type.Type)
      ).toEqual(addressByID);
    });

    it('should find base FHIR profiles', () => {
      const vitalSignsByID = defs.fishForMetadata('vitalsigns', Type.Profile);
      expect(vitalSignsByID).toEqual({
        abstract: false,
        id: 'vitalsigns',
        name: 'observation-vitalsigns',
        sdType: 'Observation',
        url: 'http://hl7.org/fhir/StructureDefinition/vitalsigns',
        parent: 'http://hl7.org/fhir/StructureDefinition/Observation'
      });
      expect(defs.fishForMetadata('observation-vitalsigns', Type.Profile)).toEqual(vitalSignsByID);
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/vitalsigns', Type.Profile)
      ).toEqual(vitalSignsByID);
    });

    it('should find base FHIR extensions', () => {
      const maidenNameExtensionByID = defs.fishForMetadata(
        'patient-mothersMaidenName',
        Type.Extension
      );
      expect(maidenNameExtensionByID).toEqual({
        abstract: false,
        id: 'patient-mothersMaidenName',
        name: 'mothersMaidenName',
        sdType: 'Extension',
        url: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension'
      });
      expect(defs.fishForMetadata('mothersMaidenName', Type.Extension)).toEqual(
        maidenNameExtensionByID
      );
      expect(
        defs.fishForMetadata(
          'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
          Type.Extension
        )
      ).toEqual(maidenNameExtensionByID);
    });

    it('should find base FHIR value sets', () => {
      const allergyStatusValueSetByID = defs.fishForMetadata(
        'allergyintolerance-clinical',
        Type.ValueSet
      );
      expect(allergyStatusValueSetByID).toEqual({
        id: 'allergyintolerance-clinical',
        name: 'AllergyIntoleranceClinicalStatusCodes',
        url: 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      });
      expect(defs.fishForMetadata('AllergyIntoleranceClinicalStatusCodes', Type.ValueSet)).toEqual(
        allergyStatusValueSetByID
      );
      expect(
        defs.fishForMetadata(
          'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical',
          Type.ValueSet
        )
      ).toEqual(allergyStatusValueSetByID);
    });

    it('should find base FHIR code sytems', () => {
      const allergyStatusCodeSystemByID = defs.fishForMetadata(
        'allergyintolerance-clinical',
        Type.CodeSystem
      );
      expect(allergyStatusCodeSystemByID).toEqual({
        id: 'allergyintolerance-clinical',
        name: 'AllergyIntoleranceClinicalStatusCodes',
        url: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
      });
      expect(
        defs.fishForMetadata('AllergyIntoleranceClinicalStatusCodes', Type.CodeSystem)
      ).toEqual(allergyStatusCodeSystemByID);
      expect(
        defs.fishForMetadata(
          'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          Type.CodeSystem
        )
      ).toEqual(allergyStatusCodeSystemByID);
    });

    it('should find definitions by the type order supplied', () => {
      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      const allergyStatusValueSetByID = defs.fishForMetadata(
        'allergyintolerance-clinical',
        Type.ValueSet,
        Type.CodeSystem
      );
      expect(allergyStatusValueSetByID.url).toBe(
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );

      const allergyStatusCodeSystemByID = defs.fishForMetadata(
        'allergyintolerance-clinical',
        Type.CodeSystem,
        Type.ValueSet
      );
      expect(allergyStatusCodeSystemByID.url).toBe(
        'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical'
      );
    });

    it('should not find the definition when the type is not requested', () => {
      const conditionByID = defs.fishForMetadata(
        'Condition',
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(conditionByID).toBeUndefined();

      const booleanByID = defs.fishForMetadata(
        'boolean',
        Type.Resource,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(booleanByID).toBeUndefined();

      const addressByID = defs.fishForMetadata(
        'Address',
        Type.Resource,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(addressByID).toBeUndefined();

      const vitalSignsProfileByID = defs.fishForMetadata(
        'vitalsigns',
        Type.Resource,
        Type.Type,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(vitalSignsProfileByID).toBeUndefined();

      const maidenNameExtensionByID = defs.fishForMetadata(
        'patient-mothersMaidenName',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.ValueSet,
        Type.CodeSystem,
        Type.Instance
      );
      expect(maidenNameExtensionByID).toBeUndefined();

      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      const allergyStatusValueSetByID = defs.fishForMetadata(
        'allergyintolerance-clinical',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.Instance
      );
      expect(allergyStatusValueSetByID).toBeUndefined();

      const w3cProvenanceCodeSystemByID = defs.fishForMetadata(
        'w3c-provenance-activity-type',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(w3cProvenanceCodeSystemByID).toBeUndefined();
    });

    it('should globally find any definition', () => {
      const conditionByID = defs.fishForMetadata('Condition');
      expect(conditionByID).toEqual({
        abstract: false,
        id: 'Condition',
        name: 'Condition',
        sdType: 'Condition',
        url: 'http://hl7.org/fhir/StructureDefinition/Condition',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource'
      });
      expect(defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/Condition')).toEqual(
        conditionByID
      );

      const booleanByID = defs.fishForMetadata('boolean');
      expect(booleanByID).toEqual({
        abstract: false,
        id: 'boolean',
        name: 'boolean',
        sdType: 'boolean',
        url: 'http://hl7.org/fhir/StructureDefinition/boolean',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element'
      });
      expect(defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/boolean')).toEqual(
        booleanByID
      );

      const addressByID = defs.fishForMetadata('Address');
      expect(addressByID).toEqual({
        abstract: false,
        id: 'Address',
        name: 'Address',
        sdType: 'Address',
        url: 'http://hl7.org/fhir/StructureDefinition/Address',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element'
      });
      expect(defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/Address')).toEqual(
        addressByID
      );

      const vitalSignsProfileByID = defs.fishForMetadata('vitalsigns');
      expect(vitalSignsProfileByID).toEqual({
        abstract: false,
        id: 'vitalsigns',
        name: 'observation-vitalsigns',
        sdType: 'Observation',
        url: 'http://hl7.org/fhir/StructureDefinition/vitalsigns',
        parent: 'http://hl7.org/fhir/StructureDefinition/Observation'
      });
      expect(defs.fishForMetadata('observation-vitalsigns')).toEqual(vitalSignsProfileByID);
      expect(defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/vitalsigns')).toEqual(
        vitalSignsProfileByID
      );

      const maidenNameExtensionByID = defs.fishForMetadata('patient-mothersMaidenName');
      expect(maidenNameExtensionByID).toEqual({
        abstract: false,
        id: 'patient-mothersMaidenName',
        name: 'mothersMaidenName',
        sdType: 'Extension',
        url: 'http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension'
      });
      expect(defs.fishForMetadata('mothersMaidenName')).toEqual(maidenNameExtensionByID);
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName')
      ).toEqual(maidenNameExtensionByID);

      // NOTE: There are two things with id allergyintolerance-clinical (the ValueSet and CodeSystem)
      // When doing a non-type-specific search, we favor the ValueSet
      const allergyStatusValueSetByID = defs.fishForMetadata('allergyintolerance-clinical');
      expect(allergyStatusValueSetByID).toEqual({
        id: 'allergyintolerance-clinical',
        name: 'AllergyIntoleranceClinicalStatusCodes',
        url: 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      });
      expect(defs.fishForMetadata('AllergyIntoleranceClinicalStatusCodes')).toEqual(
        allergyStatusValueSetByID
      );
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/ValueSet/allergyintolerance-clinical')
      ).toEqual(allergyStatusValueSetByID);

      const w3cProvenanceCodeSystemByID = defs.fishForMetadata('w3c-provenance-activity-type');
      expect(w3cProvenanceCodeSystemByID).toEqual({
        id: 'w3c-provenance-activity-type',
        name: 'W3cProvenanceActivityType',
        url: 'http://hl7.org/fhir/w3c-provenance-activity-type'
      });
      expect(defs.fishForMetadata('W3cProvenanceActivityType')).toEqual(
        w3cProvenanceCodeSystemByID
      );
      expect(defs.fishForMetadata('http://hl7.org/fhir/w3c-provenance-activity-type')).toEqual(
        w3cProvenanceCodeSystemByID
      );
    });
  });
});
