import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import path from 'path';
import { Type } from '../../src/utils/Fishable';
import { loggerSpy } from '../testhelpers';
import { cloneDeep } from 'lodash';

describe('FHIRDefinitions', () => {
  let defs: FHIRDefinitions;
  let r4bDefs: FHIRDefinitions;
  let r5Defs: FHIRDefinitions;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    // Supplemental R3 defs needed to test fishing for implied extensions
    const r3Defs = new FHIRDefinitions(true);
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r3-definitions', r3Defs);
    defs.addSupplementalFHIRDefinitions('hl7.fhir.r3.core#3.0.2', r3Defs);
    r4bDefs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4b-definitions', r4bDefs);
    r5Defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r5-definitions', r5Defs);
  });

  beforeEach(() => {
    defs.resetPredefinedResources();
    loggerSpy.reset();
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

    it('should find base FHIR logical models', () => {
      const eLTSSServiceModelByID = defs.fishForFHIR('eLTSSServiceModel', Type.Logical);
      expect(eLTSSServiceModelByID.url).toBe(
        'http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel'
      );
      expect(eLTSSServiceModelByID.version).toBe('0.1.0');
      expect(
        defs.fishForFHIR(
          'http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel',
          Type.Logical
        )
      ).toEqual(eLTSSServiceModelByID);
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

    it('should find base FHIR profiles of logical models', () => {
      const serviceProfileByID = defs.fishForFHIR('service-profile', Type.Profile);
      expect(serviceProfileByID.url).toBe(
        'http://hl7.org/fhir/some/example/StructureDefinition/ServiceProfile'
      );
      expect(serviceProfileByID.fhirVersion).toBe('4.0.1');
      expect(defs.fishForFHIR('ServiceProfile', Type.Profile)).toEqual(serviceProfileByID);
      expect(
        defs.fishForFHIR(
          'http://hl7.org/fhir/some/example/StructureDefinition/ServiceProfile',
          Type.Profile
        )
      ).toEqual(serviceProfileByID);
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

    it('should find implied extensions from other versions of FHIR', () => {
      // See: http://hl7.org/fhir/versions.html#extensions
      const patientAnimalExtensionSTU3 = defs.fishForFHIR(
        'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal',
        Type.Extension
      );
      // Just do a spot check as the detailed behavior is tested in the implied extension tests.
      expect(patientAnimalExtensionSTU3).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Patient.animal',
        url: 'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal',
        version: '3.0.2',
        name: 'Extension_Patient_animal',
        title: 'Implied extension for Patient.animal',
        description: 'Implied extension for Patient.animal',
        fhirVersion: '4.0.1'
      });
      const diffRoot = patientAnimalExtensionSTU3.differential?.element?.[0];
      expect(diffRoot.short).toEqual('This patient is known to be an animal (non-human)');
    });

    it('should not find implied extensions for versions of FHIR that are not loaded', () => {
      const patientAnimalExtensionDSTU2 = defs.fishForFHIR(
        'http://hl7.org/fhir/1.0/StructureDefinition/extension-Patient.animal',
        Type.Extension
      );
      expect(patientAnimalExtensionDSTU2).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /The extension http:\/\/hl7\.org\/fhir\/1\.0\/StructureDefinition\/extension-Patient\.animal requires/
      );
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

    it('should find the time-traveling R5 FHIR resources when R4 is loaded', () => {
      ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'].forEach(r => {
        const resourceById = defs.fishForFHIR(r, Type.Resource);
        expect(resourceById).toBeDefined();
        expect(resourceById.id).toBe(r);
        expect(resourceById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(resourceById.fhirVersion).toBe('5.0.0');
        expect(resourceById._timeTraveler).toBeTrue();
        expect(defs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should find the time-traveling R5 FHIR types when R4 is loaded', () => {
      ['Base', 'CodeableReference', 'DataType'].forEach(r => {
        const typeById = defs.fishForFHIR(r, Type.Type);
        expect(typeById).toBeDefined();
        expect(typeById.id).toBe(r);
        expect(typeById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(typeById.fhirVersion).toBe('5.0.0');
        expect(typeById._timeTraveler).toBeTrue();
        expect(defs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(typeById);
      });
    });

    it('should find the time-traveling R5 FHIR resources when R4B is loaded', () => {
      ['ActorDefinition', 'Requirements', 'TestPlan'].forEach(r => {
        const resourceById = r4bDefs.fishForFHIR(r, Type.Resource);
        expect(resourceById).toBeDefined();
        expect(resourceById.id).toBe(r);
        expect(resourceById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(resourceById.fhirVersion).toBe('5.0.0');
        expect(resourceById._timeTraveler).toBeTrue();
        expect(r4bDefs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should overwrite time-traveling R5 FHIR resources that are in R4B when R4B is loaded', () => {
      ['SubscriptionTopic'].forEach(r => {
        const resourceById = r4bDefs.fishForFHIR(r, Type.Resource);
        expect(resourceById).toBeDefined();
        expect(resourceById.id).toBe(r);
        expect(resourceById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(resourceById.fhirVersion).toBe('4.3.0');
        expect(resourceById._timeTraveler).toBeUndefined();
        expect(r4bDefs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should find the time-traveling R5 FHIR types when R4B is loaded', () => {
      ['Base', 'DataType'].forEach(r => {
        const typeById = r4bDefs.fishForFHIR(r, Type.Type);
        expect(typeById).toBeDefined();
        expect(typeById.id).toBe(r);
        expect(typeById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(typeById.fhirVersion).toBe('5.0.0');
        expect(typeById._timeTraveler).toBeTrue();
        expect(r4bDefs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should overwrite time-traveling R5 FHIR types that are in R4B when R4B is loaded', () => {
      ['CodeableReference'].forEach(r => {
        const typeById = r4bDefs.fishForFHIR(r, Type.Type);
        expect(typeById).toBeDefined();
        expect(typeById.id).toBe(r);
        expect(typeById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(typeById.fhirVersion).toBe('4.3.0');
        expect(typeById._timeTraveler).toBeUndefined();
        expect(r4bDefs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should overwrite time-traveling R5 FHIR Resources when R5 is loaded', () => {
      ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'].forEach(r => {
        const resourceById = r5Defs.fishForFHIR(r, Type.Resource);
        expect(resourceById).toBeDefined();
        expect(resourceById.id).toBe(r);
        expect(resourceById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(resourceById.fhirVersion).toBe('5.0.0');
        expect(resourceById._timeTraveler).toBeUndefined();
        expect(r5Defs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should overwrite time-traveling R5 FHIR Types when R5 is loaded', () => {
      ['Base', 'CodeableReference', , 'DataType'].forEach(r => {
        const typeById = r5Defs.fishForFHIR(r, Type.Type);
        expect(typeById).toBeDefined();
        expect(typeById.id).toBe(r);
        expect(typeById.url).toBe(`http://hl7.org/fhir/StructureDefinition/${r}`);
        expect(typeById.fhirVersion).toBe('5.0.0');
        expect(typeById._timeTraveler).toBeUndefined();
        expect(r5Defs.fishForFHIR(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should find definitions by the enforced type order', () => {
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
      expect(allergyStatusCodeSystemByID.resourceType).toBe('ValueSet');
    });

    it('should not find the definition when the type is not requested', () => {
      const conditionByID = defs.fishForFHIR(
        'Condition',
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.Instance
      );
      expect(allergyStatusValueSetByID).toBeUndefined();

      const w3cProvenanceCodeSystemByID = defs.fishForFHIR(
        'w3c-provenance-activity-type',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(w3cProvenanceCodeSystemByID).toBeUndefined();

      const eLTSSServiceModelByID = defs.fishForFHIR(
        'eLTSSServiceModel',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(eLTSSServiceModelByID).toBeUndefined();
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

      const eLTSSServiceModelByID = defs.fishForFHIR('eLTSSServiceModel');
      expect(eLTSSServiceModelByID.kind).toBe('logical');
      expect(eLTSSServiceModelByID.derivation).toBe('specialization');
      expect(
        defs.fishForFHIR('http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel')
      ).toEqual(eLTSSServiceModelByID);
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
        resourceType: 'StructureDefinition'
      });
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/StructureDefinition/Condition', Type.Resource)
      ).toEqual(conditionByID);
    });

    it('should find profiles with declared imposeProfiles', () => {
      const namedAndGenderedPatientByID = defs.fishForMetadata(
        'named-and-gendered-patient',
        Type.Profile
      );
      expect(namedAndGenderedPatientByID).toEqual({
        abstract: false,
        id: 'named-and-gendered-patient',
        name: 'NamedAndGenderedPatient',
        sdType: 'Patient',
        url: 'http://example.org/impose/StructureDefinition/named-and-gendered-patient',
        version: '0.1.0',
        parent: 'http://hl7.org/fhir/StructureDefinition/Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: [
          'http://example.org/impose/StructureDefinition/named-patient',
          'http://example.org/impose/StructureDefinition/gendered-patient'
        ]
      });
      expect(defs.fishForMetadata('NamedAndGenderedPatient', Type.Profile)).toEqual(
        namedAndGenderedPatientByID
      );
      expect(
        defs.fishForMetadata(
          'http://example.org/impose/StructureDefinition/named-and-gendered-patient',
          Type.Profile
        )
      ).toEqual(namedAndGenderedPatientByID);
    });

    it('should find base FHIR logical models', () => {
      const eLTSSServiceModelByID = defs.fishForMetadata('eLTSSServiceModel', Type.Logical);
      expect(eLTSSServiceModelByID).toEqual({
        abstract: false,
        id: 'eLTSSServiceModel',
        name: 'ELTSSServiceModel',
        sdType: 'eLTSSServiceModel',
        url: 'http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel',
        version: '0.1.0',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition',
        canBeTarget: false,
        canBind: false
      });
      expect(
        defs.fishForMetadata(
          'http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel',
          Type.Logical
        )
      ).toEqual(eLTSSServiceModelByID);
    });

    it('should find base FHIR primitive types', () => {
      const booleanByID = defs.fishForMetadata('boolean', Type.Type);
      expect(booleanByID).toEqual({
        abstract: false,
        id: 'boolean',
        name: 'boolean',
        sdType: 'boolean',
        url: 'http://hl7.org/fhir/StructureDefinition/boolean',
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Observation',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension',
        resourceType: 'StructureDefinition'
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
        url: 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical',
        version: '4.0.1',
        resourceType: 'ValueSet'
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
        url: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        version: '4.0.1',
        resourceType: 'CodeSystem'
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

    it('should find the time-traveling R5 FHIR resources when R4 is loaded', () => {
      ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'].forEach(r => {
        const resourceById = defs.fishForMetadata(r, Type.Resource);
        expect(resourceById).toEqual({
          abstract: false,
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: '5.0.0',
          parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
          resourceType: 'StructureDefinition'
        });
        expect(defs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should find the time-traveling R5 FHIR types when R4 is loaded', () => {
      ['Base', 'CodeableReference', 'DataType'].forEach(r => {
        const typeById = defs.fishForMetadata(r, Type.Type);
        expect(typeById).toEqual({
          abstract: r !== 'CodeableReference',
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: '5.0.0',
          parent:
            r === 'Base'
              ? undefined
              : r === 'CodeableReference'
                ? 'http://hl7.org/fhir/StructureDefinition/DataType'
                : 'http://hl7.org/fhir/StructureDefinition/Element',
          resourceType: 'StructureDefinition'
        });
        expect(defs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should find the time-traveling R5 FHIR resources when R4B is loaded', () => {
      ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'].forEach(r => {
        const resourceById = r4bDefs.fishForMetadata(r, Type.Resource);
        expect(resourceById).toEqual({
          abstract: false,
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: r === 'SubscriptionTopic' ? '4.3.0' : '5.0.0',
          parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
          resourceType: 'StructureDefinition'
        });
        expect(r4bDefs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should find the time-traveling R5 FHIR types when R4B is loaded', () => {
      ['Base', 'CodeableReference', 'DataType'].forEach(r => {
        const typeById = r4bDefs.fishForMetadata(r, Type.Type);
        expect(typeById).toEqual({
          abstract: r !== 'CodeableReference',
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: r === 'CodeableReference' ? '4.3.0' : '5.0.0',
          parent: r === 'Base' ? undefined : 'http://hl7.org/fhir/StructureDefinition/Element',
          resourceType: 'StructureDefinition'
        });
        expect(r4bDefs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should find the time-traveling R5 FHIR resources when R5 is loaded', () => {
      ['ActorDefinition', 'Requirements', 'SubscriptionTopic', 'TestPlan'].forEach(r => {
        const resourceById = r5Defs.fishForMetadata(r, Type.Resource);
        expect(resourceById).toEqual({
          abstract: false,
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: '5.0.0',
          parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
          resourceType: 'StructureDefinition'
        });
        expect(r5Defs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          resourceById
        );
      });
    });

    it('should find the time-traveling R5 FHIR types when R5 is loaded', () => {
      ['Base', 'CodeableReference', 'DataType'].forEach(r => {
        const typeById = r5Defs.fishForMetadata(r, Type.Type);
        expect(typeById).toEqual({
          abstract: r !== 'CodeableReference',
          id: r,
          name: r,
          sdType: r,
          url: `http://hl7.org/fhir/StructureDefinition/${r}`,
          version: '5.0.0',
          parent:
            r === 'Base'
              ? undefined
              : r === 'CodeableReference'
                ? 'http://hl7.org/fhir/StructureDefinition/DataType'
                : 'http://hl7.org/fhir/StructureDefinition/Element',
          resourceType: 'StructureDefinition'
        });
        expect(r5Defs.fishForMetadata(`http://hl7.org/fhir/StructureDefinition/${r}`)).toEqual(
          typeById
        );
      });
    });

    it('should find definitions by the enforced type order', () => {
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
        'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical'
      );
    });

    it('should not find the definition when the type is not requested', () => {
      const conditionByID = defs.fishForMetadata(
        'Condition',
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
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
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.Instance
      );
      expect(allergyStatusValueSetByID).toBeUndefined();

      const w3cProvenanceCodeSystemByID = defs.fishForMetadata(
        'w3c-provenance-activity-type',
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(w3cProvenanceCodeSystemByID).toBeUndefined();

      const eLTSSServiceModelByID = defs.fishForMetadata(
        'eLTSSServiceModel',
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.Instance
      );
      expect(eLTSSServiceModelByID).toBeUndefined();
    });

    it('should globally find any definition', () => {
      const conditionByID = defs.fishForMetadata('Condition');
      expect(conditionByID).toEqual({
        abstract: false,
        id: 'Condition',
        name: 'Condition',
        sdType: 'Condition',
        url: 'http://hl7.org/fhir/StructureDefinition/Condition',
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/DomainResource',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Observation',
        resourceType: 'StructureDefinition'
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
        version: '4.0.1',
        parent: 'http://hl7.org/fhir/StructureDefinition/Extension',
        resourceType: 'StructureDefinition'
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
        url: 'http://hl7.org/fhir/ValueSet/allergyintolerance-clinical',
        version: '4.0.1',
        resourceType: 'ValueSet'
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
        url: 'http://hl7.org/fhir/w3c-provenance-activity-type',
        version: '4.0.1',
        resourceType: 'CodeSystem'
      });
      expect(defs.fishForMetadata('W3cProvenanceActivityType')).toEqual(
        w3cProvenanceCodeSystemByID
      );
      expect(defs.fishForMetadata('http://hl7.org/fhir/w3c-provenance-activity-type')).toEqual(
        w3cProvenanceCodeSystemByID
      );

      const eLTSSServiceModelByID = defs.fishForMetadata('eLTSSServiceModel');
      expect(eLTSSServiceModelByID).toEqual({
        abstract: false,
        id: 'eLTSSServiceModel',
        name: 'ELTSSServiceModel',
        parent: 'http://hl7.org/fhir/StructureDefinition/Element',
        sdType: 'eLTSSServiceModel',
        url: 'http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel',
        version: '0.1.0',
        resourceType: 'StructureDefinition',
        canBeTarget: false,
        canBind: false
      });
      expect(defs.fishForMetadata('ELTSSServiceModel')).toEqual(eLTSSServiceModelByID);
      expect(
        defs.fishForMetadata('http://hl7.org/fhir/us/eltss/StructureDefinition/eLTSSServiceModel')
      ).toEqual(eLTSSServiceModelByID);
    });

    it('should find logical models with the can-bind type characteristic extension', () => {
      const bindableLMById = defs.fishForMetadata('BindableLM', Type.Logical);
      expect(bindableLMById).toEqual({
        abstract: false,
        id: 'BindableLM',
        name: 'BindableLM',
        sdType: 'http://example.org/StructureDefinition/BindableLM',
        url: 'http://example.org/StructureDefinition/BindableLM',
        parent: 'http://hl7.org/fhir/StructureDefinition/Base',
        resourceType: 'StructureDefinition',
        canBeTarget: false,
        canBind: true // BindableLM has can-bind type-characteristics extension
      });
      expect(
        defs.fishForMetadata('http://example.org/StructureDefinition/BindableLM', Type.Logical)
      ).toEqual(bindableLMById);
    });
  });

  describe('#fishForPredefinedResource', () => {
    it('should not find resources that are not predefined', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      const predefinedCondition = defs.fishForPredefinedResource('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different resourceTypes', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: 'foo',
        id: condition.id,
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResource('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different ids', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: 'foo',
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResource('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different urls', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: condition.id,
        url: 'foo'
      });
      const predefinedCondition = defs.fishForPredefinedResource('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should find resources that are predefined', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: condition.id,
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResource('Condition');
      expect(predefinedCondition.id).toBe('Condition');
    });
  });

  describe('#fishForPredefinedResourceMetadata', () => {
    it('should not find resources that are not predefined', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      const predefinedCondition = defs.fishForPredefinedResourceMetadata('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different resourceTypes', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: 'foo',
        id: condition.id,
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResourceMetadata('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different ids', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: 'foo',
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResourceMetadata('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should not find resources that are predefined with different urls', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: condition.id,
        url: 'foo'
      });
      const predefinedCondition = defs.fishForPredefinedResourceMetadata('Condition');
      expect(predefinedCondition).toBeUndefined();
    });

    it('should find resources that are predefined', () => {
      const condition = defs.fishForFHIR('Condition');
      expect(condition.id).toBe('Condition');
      defs.addPredefinedResource('', {
        resourceType: condition.resourceType,
        id: condition.id,
        url: condition.url
      });
      const predefinedCondition = defs.fishForPredefinedResourceMetadata('Condition');
      expect(predefinedCondition.id).toBe('Condition');
    });

    it('should find profiles with declared imposeProfiles', () => {
      const namedAndGenderedPatient = cloneDeep(defs.fishForFHIR('NamedAndGenderedPatient'));
      defs.addPredefinedResource('', cloneDeep(namedAndGenderedPatient));

      const predefinedNamedAndGenderedPatient =
        defs.fishForPredefinedResourceMetadata('NamedAndGenderedPatient');
      expect(predefinedNamedAndGenderedPatient).toEqual({
        abstract: false,
        id: 'named-and-gendered-patient',
        name: 'NamedAndGenderedPatient',
        sdType: 'Patient',
        url: 'http://example.org/impose/StructureDefinition/named-and-gendered-patient',
        version: '0.1.0',
        parent: 'http://hl7.org/fhir/StructureDefinition/Patient',
        resourceType: 'StructureDefinition',
        imposeProfiles: [
          'http://example.org/impose/StructureDefinition/named-patient',
          'http://example.org/impose/StructureDefinition/gendered-patient'
        ]
      });
      expect(
        defs.fishForPredefinedResourceMetadata('NamedAndGenderedPatient', Type.Profile)
      ).toEqual(predefinedNamedAndGenderedPatient);
      expect(
        defs.fishForPredefinedResourceMetadata(
          'http://example.org/impose/StructureDefinition/named-and-gendered-patient',
          Type.Profile
        )
      ).toEqual(predefinedNamedAndGenderedPatient);
    });
  });

  describe('#supplementalFHIRPackages', () => {
    it('should list no supplemental FHIR packages when none have been loaded', () => {
      const defs = new FHIRDefinitions();
      expect(defs.supplementalFHIRPackages).toEqual([]);
    });

    it('should list loaded supplemental FHIR packages', () => {
      const defs = new FHIRDefinitions();
      // normally the loader would maintain the package array, but since we're not using the loader, we need to populate it here
      const r3 = new FHIRDefinitions(true);
      const r5 = new FHIRDefinitions(true);
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r3.core#3.0.2', r3);
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r5.core#5.0.0', r5);
      expect(defs.supplementalFHIRPackages).toEqual([
        'hl7.fhir.r3.core#3.0.2',
        'hl7.fhir.r5.core#5.0.0'
      ]);
    });
  });
});
