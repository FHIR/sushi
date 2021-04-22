import path from 'path';
import { FHIRDefinitions, loadFromPath } from '../../src/fhirdefs';
import {
  isImpliedExtension,
  materializeImpliedExtension
} from '../../src/fhirdefs/impliedExtensions';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('impliedExtensions', () => {
  describe('#isImpliedExtension()', () => {
    it('should recognize DSTU2-based implied extensions', () => {
      expect(
        isImpliedExtension(
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.extensible'
        )
      ).toBeTruthy();
    });

    it('should recognize STU3-based implied extensions', () => {
      expect(
        isImpliedExtension(
          'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species'
        )
      ).toBeTruthy();
    });

    it('should recognize R4-based implied extensions', () => {
      expect(
        isImpliedExtension('http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.signature')
      ).toBeTruthy();
    });

    it('should recognize R5-based implied extensions', () => {
      expect(
        isImpliedExtension(
          'http://hl7.org/fhir/5.0/StructureDefinition/extension-Substance.quantity'
        )
      ).toBeTruthy();
    });
  });

  describe('#materializeImpliedExtension()', () => {
    let defs: FHIRDefinitions;
    beforeEach(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'testdefs',
        defs
      );
      const r2Defs = new FHIRDefinitions(true);
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'r2-definitions'),
        'hl7.fhir.r2.core#1.0.2',
        r2Defs
      );
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r2.core#1.0.2', r2Defs);
      const r3Defs = new FHIRDefinitions(true);
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'r3-definitions'),
        'hl7.fhir.r3.core#3.0.2',
        r3Defs
      );
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r3.core#3.0.2', r3Defs);
      const r5Defs = new FHIRDefinitions(true);
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'r5-definitions'),
        'hl7.fhir.r5.core#4.6.0',
        r5Defs
      );
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r5.core#current', r5Defs);
      loggerSpy.reset();
    });

    it('should log an error if the extension URL is not an implied extension', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/StructureDefinition/extension-MissingVersion',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension \(http:\/\/hl7\.org\/fhir\/StructureDefinition\/extension-MissingVersion\) .* pattern .*/
      );
    });

    it('should log an error if the extension URL indicates an unsupported FHIR version', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/2.0/StructureDefinition/extension-Patient.animal',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension \(http:\/\/hl7\.org\/fhir\/2\.0\/StructureDefinition\/extension-Patient\.animal\) .* pattern .*/
      );
    });

    it('should log an error if the target resource does not exist in the target version', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-MedicationRequest.status',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension \(http:\/\/hl7\.org\/fhir\/1\.0\/StructureDefinition\/extension-MedicationRequest\.status\) .* MedicationRequest .*/
      );
    });

    it('should log an error if the id does not exist in the target resource', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.happiness',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension \(http:\/\/hl7\.org\/fhir\/1\.0\/StructureDefinition\/extension-ValueSet\.happiness\) .* ValueSet.happiness .* ValueSet/
      );
    });

    it('should log an error if the target element has type Resource', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-Bundle.entry.resource',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension \(http:\/\/hl7\.org\/fhir\/1\.0\/StructureDefinition\/extension-Bundle\.entry\.resource\) .* Resource/
      );
    });

    it('should materialize a simple R2 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.extensible',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-ValueSet.extensible',
        url: 'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.extensible',
        version: '1.0.2',
        name: 'Extension_ValueSet_extensible',
        title: 'Implied extension for ValueSet.extensible',
        status: 'active',
        description: 'Implied extension for ValueSet.extensible',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Whether this is intended to be used with an extensible binding',
        definition: 'Whether this is intended to be used with an extensible binding or not.',
        requirements: 'It is not required to say whether this intent applies.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.extensible'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        type: [{ code: 'boolean' }]
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a complex R2 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.contact',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-ValueSet.contact',
        url: 'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.contact',
        version: '1.0.2',
        name: 'Extension_ValueSet_contact',
        title: 'Implied extension for ValueSet.contact',
        status: 'active',
        description: 'Implied extension for ValueSet.contact',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Contact details of the publisher',
        definition: 'Contacts to assist a user in finding and communicating with the publisher.',
        comment: 'May be a web site, an email address, a telephone number, etc.'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/1.0/StructureDefinition/extension-ValueSet.contact'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toBeUndefined(); // slicing is already present in Extension.extension
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        id: 'Extension.extension',
        path: 'Extension.extension',
        min: 0,
        max: '*',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          rules: 'open'
        }
      });

      const diffName = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:name'
      );
      expect(diffName).toEqual({
        id: 'Extension.extension:name',
        path: 'Extension.extension',
        sliceName: 'name',
        short: 'Name of an individual to contact',
        definition: 'The name of an individual to contact regarding the value set.',
        comment: 'If there is no named individual, the telecom is for the organization as a whole.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapName = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension:name');
      expect(snapName).toMatchObject(diffName);

      const diffNameURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:name.url'
      );
      expect(diffNameURL).toEqual({
        id: 'Extension.extension:name.url',
        path: 'Extension.extension.url',
        fixedUri: 'name'
      });
      const snapNameURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:name.url'
      );
      expect(snapNameURL).toMatchObject(diffNameURL);

      const diffNameValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:name.value[x]'
      );
      expect(diffNameValue).toEqual({
        id: 'Extension.extension:name.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'string' }]
      });
      const snapNameValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:name.value[x]'
      );
      expect(snapNameValue).toMatchObject(diffNameValue);

      const diffTelecom = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom'
      );
      expect(diffTelecom).toEqual({
        id: 'Extension.extension:telecom',
        path: 'Extension.extension',
        sliceName: 'telecom',
        short: 'Contact details for individual or publisher',
        definition: 'Contact details for individual (if a name was provided) or the publisher.',
        min: 0,
        max: '*',
        type: [{ code: 'Extension' }]
      });
      const snapTelecom = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom'
      );
      expect(snapTelecom).toMatchObject(diffTelecom);

      const diffTelecomURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom.url'
      );
      expect(diffTelecomURL).toEqual({
        id: 'Extension.extension:telecom.url',
        path: 'Extension.extension.url',
        fixedUri: 'telecom'
      });
      const snapTelecomURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom.url'
      );
      expect(snapTelecomURL).toMatchObject(diffTelecomURL);

      const diffTelecomValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom.value[x]'
      );
      expect(diffTelecomValue).toEqual({
        id: 'Extension.extension:telecom.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'ContactPoint' }]
      });
      const snapTelecomValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:telecom.value[x]'
      );
      expect(snapTelecomValue).toMatchObject(diffTelecomValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a simple R3 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Patient.animal.species',
        url: 'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species',
        version: '3.0.2',
        name: 'Extension_Patient_animal_species',
        title: 'Implied extension for Patient.animal.species',
        status: 'active',
        description: 'Implied extension for Patient.animal.species',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'E.g. Dog, Cow',
        definition: 'Identifies the high level taxonomic categorization of the kind of animal.',
        comment:
          'If the patient is non-human, at least a species SHALL be specified. Species SHALL be ' +
          'a widely recognised taxonomic classification.  It may or may not be Linnaean taxonomy ' +
          'and may or may not be at the level of species. If the level is finer than ' +
          'species--such as a breed code--the code system used SHALL allow inference of the ' +
          'species.  (The common example is that the word "Hereford" does not allow inference of ' +
          'the species Bos taurus, because there is a Hereford pig breed, but the SNOMED CT code ' +
          'for "Hereford Cattle Breed" does.).',
        requirements: 'Need to know what kind of animal.',
        min: 1,
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          strength: 'example',
          description: 'The species of an animal.',
          valueSet: 'http://hl7.org/fhir/ValueSet/animal-species'
        }
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a complex R3 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Patient.animal',
        url: 'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal',
        version: '3.0.2',
        name: 'Extension_Patient_animal',
        title: 'Implied extension for Patient.animal',
        status: 'active',
        description: 'Implied extension for Patient.animal',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'This patient is known to be an animal (non-human)',
        definition: 'This patient is known to be an animal.',
        comment:
          'The animal element is labeled "Is Modifier" since patients may be non-human. Systems ' +
          'SHALL either handle patient details appropriately (e.g. inform users patient is not ' +
          'human) or reject declared animal records.   The absense of the animal element does ' +
          'not imply that the patient is a human. If a system requires such a positive ' +
          'assertion that the patient is human, an extension will be required.  (Do not use a ' +
          'species of homo-sapiens in animal species, as this would incorrectly infer that the ' +
          'patient is an animal).',
        requirements:
          'Many clinical systems are extended to care for animal patients as well as human.',
        max: '1',
        isModifier: true
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        min: 1
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        max: '*',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          rules: 'open'
        }
      });

      const diffSpecies = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:species'
      );
      expect(diffSpecies).toEqual({
        id: 'Extension.extension:species',
        path: 'Extension.extension',
        sliceName: 'species',
        short: 'E.g. Dog, Cow',
        definition: 'Identifies the high level taxonomic categorization of the kind of animal.',
        comment:
          'If the patient is non-human, at least a species SHALL be specified. Species SHALL be ' +
          'a widely recognised taxonomic classification.  It may or may not be Linnaean taxonomy ' +
          'and may or may not be at the level of species. If the level is finer than ' +
          'species--such as a breed code--the code system used SHALL allow inference of the ' +
          'species.  (The common example is that the word "Hereford" does not allow inference of ' +
          'the species Bos taurus, because there is a Hereford pig breed, but the SNOMED CT code ' +
          'for "Hereford Cattle Breed" does.).',
        requirements: 'Need to know what kind of animal.',
        min: 1,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapSpecies = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:species'
      );
      expect(snapSpecies).toMatchObject(diffSpecies);

      const diffSpeciesURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:species.url'
      );
      expect(diffSpeciesURL).toEqual({
        id: 'Extension.extension:species.url',
        path: 'Extension.extension.url',
        fixedUri: 'species'
      });
      const snapSpeciesURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:species.url'
      );
      expect(snapSpeciesURL).toMatchObject(diffSpeciesURL);

      const diffSpeciesValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:species.value[x]'
      );
      expect(diffSpeciesValue).toEqual({
        id: 'Extension.extension:species.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          description: 'The species of an animal.',
          strength: 'example',
          valueSet: 'http://hl7.org/fhir/ValueSet/animal-species'
        }
      });
      const snapSpeciesValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:species.value[x]'
      );
      expect(snapSpeciesValue).toMatchObject(diffSpeciesValue);

      const diffBreed = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed'
      );
      expect(diffBreed).toEqual({
        id: 'Extension.extension:breed',
        path: 'Extension.extension',
        sliceName: 'breed',
        short: 'E.g. Poodle, Angus',
        definition: 'Identifies the detailed categorization of the kind of animal.',
        comment:
          'Breed MAY be used to provide further taxonomic or non-taxonomic classification.  It ' +
          'may involve local or proprietary designation--such as commercial strain--and/or ' +
          'additional information such as production type.',
        requirements: 'May need to know the specific kind within the species.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapBreed = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed'
      );
      expect(snapBreed).toMatchObject(diffBreed);

      const diffBreedURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed.url'
      );
      expect(diffBreedURL).toEqual({
        id: 'Extension.extension:breed.url',
        path: 'Extension.extension.url',
        fixedUri: 'breed'
      });
      const snapBreedURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed.url'
      );
      expect(snapBreedURL).toMatchObject(diffBreedURL);

      const diffBreedValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed.value[x]'
      );
      expect(diffBreedValue).toEqual({
        id: 'Extension.extension:breed.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          description: 'The breed of an animal.',
          strength: 'example',
          valueSet: 'http://hl7.org/fhir/ValueSet/animal-breeds'
        }
      });
      const snapBreedValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:breed.value[x]'
      );
      expect(snapBreedValue).toMatchObject(diffBreedValue);

      const diffGender = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus'
      );
      expect(diffGender).toEqual({
        id: 'Extension.extension:genderStatus',
        path: 'Extension.extension',
        sliceName: 'genderStatus',
        short: 'E.g. Neutered, Intact',
        definition: "Indicates the current state of the animal's reproductive organs.",
        requirements: 'Gender status can affect housing and animal behavior.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapGender = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus'
      );
      expect(snapGender).toMatchObject(diffGender);

      const diffGenderURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus.url'
      );
      expect(diffGenderURL).toEqual({
        id: 'Extension.extension:genderStatus.url',
        path: 'Extension.extension.url',
        fixedUri: 'genderStatus'
      });
      const snapGenderURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus.url'
      );
      expect(snapGenderURL).toMatchObject(diffGenderURL);

      const diffGenderValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus.value[x]'
      );
      expect(diffGenderValue).toEqual({
        id: 'Extension.extension:genderStatus.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          description: "The state of the animal's reproductive organs.",
          strength: 'example',
          valueSet: 'http://hl7.org/fhir/ValueSet/animal-genderstatus'
        }
      });
      const snapGenderValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:genderStatus.value[x]'
      );
      expect(snapGenderValue).toMatchObject(diffGenderValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a simple R5 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.informationSource',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-MedicationRequest.informationSource',
        url:
          'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.informationSource',
        version: '4.6.0',
        name: 'Extension_MedicationRequest_informationSource',
        title: 'Implied extension for MedicationRequest.informationSource',
        status: 'active',
        description: 'Implied extension for MedicationRequest.informationSource',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short:
          'The person or organization who provided the information about this request, if the ' +
          'source is someone other than the requestor',
        definition:
          'The person or organization who provided the information about this request, if the ' +
          'source is someone other than the requestor.  This is often used when the ' +
          'MedicationRequest is reported by another person.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri:
          'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.informationSource'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        type: [
          {
            code: 'Reference',
            targetProfile: [
              'http://hl7.org/fhir/StructureDefinition/Patient',
              'http://hl7.org/fhir/StructureDefinition/Practitioner',
              'http://hl7.org/fhir/StructureDefinition/PractitionerRole',
              'http://hl7.org/fhir/StructureDefinition/RelatedPerson',
              'http://hl7.org/fhir/StructureDefinition/Organization'
            ]
          }
        ]
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a complex R5 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.substitution',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-MedicationRequest.substitution',
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.substitution',
        version: '4.6.0',
        name: 'Extension_MedicationRequest_substitution',
        title: 'Implied extension for MedicationRequest.substitution',
        status: 'active',
        description: 'Implied extension for MedicationRequest.substitution',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Any restrictions on medication substitution',
        definition:
          'Indicates whether or not substitution can or should be part of the dispense. In some ' +
          'cases, substitution must happen, in other cases substitution must not happen. This ' +
          "block explains the prescriber's intent. If nothing is specified substitution may be " +
          'done.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri:
          'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.substitution'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        min: 1
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        max: '*',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          rules: 'open'
        }
      });

      const diffAllowed = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x]'
      );
      expect(diffAllowed).toEqual({
        id: 'Extension.extension:allowed[x]',
        path: 'Extension.extension',
        sliceName: 'allowed[x]',
        short: 'Whether substitution is allowed or not',
        definition:
          'True if the prescriber allows a different drug to be dispensed from what was prescribed.',
        comment:
          'This element is labeled as a modifier because whether substitution is allow or not, it ' +
          'cannot be ignored.',
        min: 1,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapAllowed = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x]'
      );
      expect(snapAllowed).toMatchObject(diffAllowed);

      const diffAllowedURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x].url'
      );
      expect(diffAllowedURL).toEqual({
        id: 'Extension.extension:allowed[x].url',
        path: 'Extension.extension.url',
        fixedUri: 'allowed[x]'
      });
      const snapAllowedURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x].url'
      );
      expect(snapAllowedURL).toMatchObject(diffAllowedURL);

      const diffAllowedValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x].value[x]'
      );
      expect(diffAllowedValue).toEqual({
        id: 'Extension.extension:allowed[x].value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'boolean' }, { code: 'CodeableConcept' }],
        binding: {
          description: 'Identifies the type of substitution allowed.',
          strength: 'example',
          valueSet: 'http://terminology.hl7.org/ValueSet/v3-ActSubstanceAdminSubstitutionCode'
        }
      });
      const snapAllowedValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:allowed[x].value[x]'
      );
      expect(snapAllowedValue).toMatchObject(diffAllowedValue);

      const diffReason = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason'
      );
      expect(diffReason).toEqual({
        id: 'Extension.extension:reason',
        path: 'Extension.extension',
        sliceName: 'reason',
        short: 'Why should (not) substitution be made',
        definition:
          'Indicates the reason for the substitution, or why substitution must or must not be performed.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapReason = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason'
      );
      expect(snapReason).toMatchObject(diffReason);

      const diffReasonURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason.url'
      );
      expect(diffReasonURL).toEqual({
        id: 'Extension.extension:reason.url',
        path: 'Extension.extension.url',
        fixedUri: 'reason'
      });
      const snapReasonURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason.url'
      );
      expect(snapReasonURL).toMatchObject(diffReasonURL);

      const diffReasonValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason.value[x]'
      );
      expect(diffReasonValue).toEqual({
        id: 'Extension.extension:reason.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          description: 'SubstanceAdminSubstitutionReason',
          strength: 'example',
          valueSet: 'http://terminology.hl7.org/ValueSet/v3-SubstanceAdminSubstitutionReason'
        }
      });
      const snapReasonValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reason.value[x]'
      );
      expect(snapReasonValue).toMatchObject(diffReasonValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a complex R5 extension for CodeableReference', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.medication',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-MedicationRequest.medication',
        url: 'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.medication',
        version: '4.6.0',
        name: 'Extension_MedicationRequest_medication',
        title: 'Implied extension for MedicationRequest.medication',
        status: 'active',
        description: 'Implied extension for MedicationRequest.medication',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Medication to be taken',
        definition:
          'Identifies the medication being requested. This is a link to a resource that ' +
          'represents the medication which may be the details of the medication or simply an ' +
          'attribute carrying a code that identifies the medication from a known list of ' +
          'medications.',
        comment:
          'If only a code is specified, then it needs to be a code for a specific product. If ' +
          'more information is required, then the use of the Medication resource is ' +
          'recommended.  For example, if you require form or lot number or if the medication is ' +
          'compounded or extemporaneously prepared, then you must reference the Medication ' +
          'resource.',
        min: 1,
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri:
          'http://hl7.org/fhir/5.0/StructureDefinition/extension-MedicationRequest.medication'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        id: 'Extension.extension',
        path: 'Extension.extension',
        min: 0,
        max: '*',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          rules: 'open'
        }
      });

      const diffConcept = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept'
      );
      expect(diffConcept).toEqual({
        id: 'Extension.extension:concept',
        path: 'Extension.extension',
        sliceName: 'concept',
        short: 'Reference to a concept (by class)',
        definition:
          "A reference to a concept - e.g. the information is identified by it's general " +
          'classto the degree of precision found in the terminology.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapConcept = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept'
      );
      expect(snapConcept).toMatchObject(diffConcept);

      const diffConceptURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept.url'
      );
      expect(diffConceptURL).toEqual({
        id: 'Extension.extension:concept.url',
        path: 'Extension.extension.url',
        fixedUri: 'concept'
      });
      const snapConceptURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept.url'
      );
      expect(snapConceptURL).toMatchObject(diffConceptURL);

      // It should move the binding from the CodeableReference to the CodeableReference.concept
      const diffConceptValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept.value[x]'
      );
      expect(diffConceptValue).toEqual({
        id: 'Extension.extension:concept.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'CodeableConcept' }],
        binding: {
          strength: 'example',
          description: 'A coded concept identifying substance or product that can be ordered.',
          valueSet: 'http://hl7.org/fhir/ValueSet/medication-codes'
        }
      });
      const snapConceptValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:concept.value[x]'
      );
      expect(snapConceptValue).toMatchObject(diffConceptValue);

      const diffReference = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference'
      );
      expect(diffReference).toEqual({
        id: 'Extension.extension:reference',
        path: 'Extension.extension',
        sliceName: 'reference',
        short: 'Reference to a resource (by instance)',
        definition:
          'A reference to a resource the provides exact details about the information being referenced.',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapReference = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference'
      );
      expect(snapReference).toMatchObject(diffReference);

      const diffReferenceURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference.url'
      );
      expect(diffReferenceURL).toEqual({
        id: 'Extension.extension:reference.url',
        path: 'Extension.extension.url',
        fixedUri: 'reference'
      });
      const snapReferenceURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference.url'
      );
      expect(snapReferenceURL).toMatchObject(diffReferenceURL);

      // It should move the reference types from the CodeableReference to the CodeableReference.reference
      const diffReferenceValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference.value[x]'
      );
      expect(diffReferenceValue).toEqual({
        id: 'Extension.extension:reference.value[x]',
        path: 'Extension.extension.value[x]',
        type: [
          {
            code: 'Reference',
            targetProfile: ['http://hl7.org/fhir/StructureDefinition/Medication']
          }
        ]
      });
      const snapReferenceValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:reference.value[x]'
      );
      expect(snapReferenceValue).toMatchObject(diffReferenceValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should automatically convert references to resources that have been renamed', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/1.0/StructureDefinition/extension-MedicationAdministration.prescription',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-MedicationAdministration.prescription',
        url:
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-MedicationAdministration.prescription',
        version: '1.0.2',
        name: 'Extension_MedicationAdministration_prescription',
        title: 'Implied extension for MedicationAdministration.prescription',
        status: 'active',
        description: 'Implied extension for MedicationAdministration.prescription',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Order administration performed against',
        definition: 'The original request, instruction or authority to perform the administration.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri:
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-MedicationAdministration.prescription'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        // NOTE: targetProfile to MedicationRequest (not MedicationOrder)
        type: [
          {
            code: 'Reference',
            targetProfile: ['http://hl7.org/fhir/StructureDefinition/MedicationRequest']
          }
        ]
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should remove types w/ no existing equivalent and issue a warning', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/1.0/StructureDefinition/extension-DiagnosticReport.imagingStudy',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-DiagnosticReport.imagingStudy',
        url: 'http://hl7.org/fhir/1.0/StructureDefinition/extension-DiagnosticReport.imagingStudy',
        version: '1.0.2',
        name: 'Extension_DiagnosticReport_imagingStudy',
        title: 'Implied extension for DiagnosticReport.imagingStudy',
        status: 'active',
        description: 'Implied extension for DiagnosticReport.imagingStudy',
        fhirVersion: '4.0.1',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Reference to full details of imaging associated with the diagnostic report',
        definition:
          'One or more links to full details of any imaging performed during the diagnostic ' +
          'investigation. Typically, this is imaging performed by DICOM enabled modalities, but ' +
          'this is not required. A fully enabled PACS viewer can use this information to ' +
          'provide views of the source images.',
        comment:
          'ImagingStudy and ImageObjectStudy and the image element are somewhat overlapping - ' +
          'typically, the list of image references in the image element will also be found in ' +
          'one of the imaging study resources. However each caters to different types of ' +
          'displays for different types of purposes. Neither, either, or both may be provided.'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri:
          'http://hl7.org/fhir/1.0/StructureDefinition/extension-DiagnosticReport.imagingStudy'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        type: [
          {
            code: 'Reference',
            targetProfile: ['http://hl7.org/fhir/StructureDefinition/ImagingStudy']
          }
        ]
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllMessages('warn')).toEqual([
        'Implied extension (http://hl7.org/fhir/1.0/StructureDefinition/extension-DiagnosticReport.imagingStudy) ' +
          'is incomplete since the following type has no equivalent in FHIR 4.0.1: ' +
          'http://hl7.org/fhir/StructureDefinition/ImagingObjectSelection.'
      ]);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });

  describe('#materializeImpliedExtensionFromR5Project()', () => {
    let defs: FHIRDefinitions;
    beforeEach(() => {
      defs = new FHIRDefinitions();
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'r5-definitions'),
        'hl7.fhir.r5.core#4.6.0',
        defs
      );
      const r4Defs = new FHIRDefinitions(true);
      loadFromPath(
        path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
        'hl7.fhir.r4.core#4.0.1',
        r4Defs
      );
      defs.addSupplementalFHIRDefinitions('hl7.fhir.r4.core#4.0.1', r4Defs);
      loggerSpy.reset();
    });

    // This test is here (instead of w/ the other error checking tests) because the other suite
    // loads all the supplemental versions of FHIR, so we can't test a condition for unloaded
    // versions of FHIR there.
    it('should log an error if the supplemental FHIR version is not loaded', () => {
      expect(
        materializeImpliedExtension(
          'http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species',
          defs
        )
      ).toBeUndefined();
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot materialize implied extension: http:\/\/hl7\.org\/fhir\/3\.0\/StructureDefinition\/extension-Patient\.animal\.species\.\n.*\n.*hl7\.fhir\.extensions\.r3: 4\.6\.0/
      );
    });

    // We force the infinite recursion situation in test by referring to an element whose type refers
    // to itself and does not exist in our test R5 package. A simple primitive does the trick.
    it('should avoid infinite recursion of recursive elements', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.timestamp',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Bundle.timestamp',
        url: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.timestamp',
        version: '4.0.1',
        name: 'Extension_Bundle_timestamp',
        title: 'Implied extension for Bundle.timestamp',
        status: 'active',
        description: 'Implied extension for Bundle.timestamp',
        fhirVersion: '4.6.0',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'When the bundle was assembled',
        definition:
          'The date/time that the bundle was assembled - i.e. when the resources were placed ' +
          'in the bundle.',
        comment:
          'For many bundles, the timestamp is equal to .meta.lastUpdated, because they are not ' +
          'stored (e.g. search results). When a bundle is placed in a persistent store, ' +
          '.meta.lastUpdated will be usually be changed by the server. When the bundle is a ' +
          'message, a middleware agent altering the message (even if not stored) SHOULD update ' +
          '.meta.lastUpdated. .timestamp is used to track the original time of the Bundle, and ' +
          'SHOULD be populated.  \n\nUsage:\n\n* document : the date the document was created. ' +
          'Note: the composition may predate the document, or be associated with multiple ' +
          'documents. The date of the composition - the authoring time - may be earlier than the ' +
          'document assembly time\n* message : the date that the content of the message was ' +
          'assembled. This date is not changed by middleware engines unless they add additional ' +
          'data that changes the meaning of the time of the message\n* history : the date that ' +
          'the history was assembled. This time would be used as the _since time to ask for ' +
          'subsequent updates\n* searchset : the time that the search set was assembled. Note ' +
          'that different pages MAY have different timestamps but need not. Having different ' +
          'timestamps does not imply that subsequent pages will represent or include changes ' +
          'made since the initial query\n* transaction | transaction-response | batch | ' +
          'batch-response | collection : no particular assigned meaning\n\nThe timestamp value ' +
          'should be greater than the lastUpdated and other timestamps in the resources in the ' +
          'bundle, and it should be equal or earlier than the .meta.lastUpdated on the Bundle ' +
          'itself.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.timestamp'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const diffExtValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:value'
      );
      expect(diffExtValue).toEqual({
        id: 'Extension.extension:value',
        path: 'Extension.extension',
        sliceName: 'value',
        short: 'Primitive value for instant',
        definition: 'The actual value',
        min: 0,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapExtValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:value'
      );
      expect(snapExtValue).toMatchObject(diffExtValue);

      const diffExtValueURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:value.url'
      );
      expect(diffExtValueURL).toEqual({
        id: 'Extension.extension:value.url',
        path: 'Extension.extension.url',
        fixedUri: 'value'
      });
      const snapExtValueURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:value.url'
      );
      expect(snapExtValueURL).toMatchObject(diffExtValueURL);

      expect(loggerSpy.getLastMessage('warn')).toEqual(
        'Implied extension (http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.timestamp) ' +
          'is incomplete because Extension.extension:value causes sub-extension recursion.'
      );
    });

    it('should materialize a simple R4 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.signature',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Bundle.signature',
        url: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.signature',
        version: '4.0.1',
        name: 'Extension_Bundle_signature',
        title: 'Implied extension for Bundle.signature',
        status: 'active',
        description: 'Implied extension for Bundle.signature',
        fhirVersion: '4.6.0',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Digital Signature',
        definition: 'Digital Signature - base64 encoded. XML-DSig or a JWT.',
        comment:
          'The signature could be created by the "author" of the bundle or by the originating ' +
          'device.   Requirements around inclusion of a signature, verification of signatures ' +
          'and treatment of signed/non-signed bundles is implementation-environment specific.',
        requirements:
          'A Signature holds an electronic representation of a signature and its supporting ' +
          'context in a FHIR accessible form. The signature may either be a cryptographic type ' +
          '(XML DigSig or a JWS), which is able to provide non-repudiation proof, or it may be ' +
          'a graphical image that represents a signature or a signature process. This element ' +
          'allows capturing signatures on documents, messages, transactions or even search ' +
          'responses, to support content-authentication, non-repudiation or other business ' +
          'cases. This is primarily relevant where the bundle may travel through multiple hops ' +
          'or via other mechanisms where HTTPS non-repudiation is insufficient.',
        max: '1'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        max: '0'
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        min: 0,
        max: '0'
      });

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.signature'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        type: [{ code: 'Signature' }]
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject(diffValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should materialize a complex R4 extension', () => {
      const ext = materializeImpliedExtension(
        'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.link',
        defs
      );
      expect(ext).toBeDefined();
      expect(ext).toMatchObject({
        resourceType: 'StructureDefinition',
        id: 'extension-Bundle.link',
        url: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.link',
        version: '4.0.1',
        name: 'Extension_Bundle_link',
        title: 'Implied extension for Bundle.link',
        status: 'active',
        description: 'Implied extension for Bundle.link',
        fhirVersion: '4.6.0',
        kind: 'complex-type',
        abstract: false,
        context: [{ type: 'element', expression: 'Element' }],
        type: 'Extension',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
        derivation: 'constraint'
      });

      const diffRoot = ext.differential?.element?.[0];
      expect(diffRoot).toEqual({
        id: 'Extension',
        path: 'Extension',
        short: 'Links related to this Bundle',
        definition: 'A series of links that provide context to this bundle.',
        comment:
          'Both Bundle.link and Bundle.entry.link are defined to support providing additional ' +
          'context when Bundles are used (e.g. [HATEOAS](http://en.wikipedia.org/wiki/HATEOAS)). ' +
          '\n\nBundle.entry.link corresponds to links found in the HTTP header if the resource ' +
          'in the entry was [read](http.html#read) directly.\n\nThis specification defines some ' +
          'specific uses of Bundle.link for [searching](search.html#conformance) and ' +
          '[paging](http.html#paging), but no specific uses for Bundle.entry.link, and no ' +
          'defined function in a transaction - the meaning is implementation specific.'
      });
      const snapRoot = ext.snapshot?.element?.[0];
      expect(snapRoot).toMatchObject(diffRoot);

      const diffUrl = ext.differential?.element?.find((e: any) => e.id === 'Extension.url');
      expect(diffUrl).toEqual({
        id: 'Extension.url',
        path: 'Extension.url',
        fixedUri: 'http://hl7.org/fhir/4.0/StructureDefinition/extension-Bundle.link'
      });
      const snapUrl = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.url');
      expect(snapUrl).toMatchObject(diffUrl);

      const diffValue = ext.differential?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(diffValue).toEqual({
        id: 'Extension.value[x]',
        path: 'Extension.value[x]',
        max: '0'
      });
      const snapValue = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.value[x]');
      expect(snapValue).toMatchObject({
        ...diffValue,
        min: 0,
        max: '0'
      });

      const diffExt = ext.differential?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(diffExt).toEqual({
        id: 'Extension.extension',
        path: 'Extension.extension',
        min: 2
      });
      const snapExt = ext.snapshot?.element?.find((e: any) => e.id === 'Extension.extension');
      expect(snapExt).toMatchObject({
        ...diffExt,
        max: '*',
        slicing: {
          discriminator: [{ type: 'value', path: 'url' }],
          rules: 'open'
        }
      });

      const diffRelation = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation'
      );
      expect(diffRelation).toEqual({
        id: 'Extension.extension:relation',
        path: 'Extension.extension',
        sliceName: 'relation',
        short:
          'See http://www.iana.org/assignments/link-relations/link-relations.xhtml#link-relations-1',
        definition:
          'A name which details the functional use for this link - see ' +
          '[http://www.iana.org/assignments/link-relations/link-relations.xhtml#link-relations-1]' +
          '(http://www.iana.org/assignments/link-relations/link-relations.xhtml#link-relations-1).',
        min: 1,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapRelation = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation'
      );
      expect(snapRelation).toMatchObject(diffRelation);

      const diffRelationURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation.url'
      );
      expect(diffRelationURL).toEqual({
        id: 'Extension.extension:relation.url',
        path: 'Extension.extension.url',
        fixedUri: 'relation'
      });
      const snapRelationURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation.url'
      );
      expect(snapRelationURL).toMatchObject(diffRelationURL);

      const diffRelationValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation.value[x]'
      );
      expect(diffRelationValue).toEqual({
        id: 'Extension.extension:relation.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'string' }]
      });
      const snapRelationValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:relation.value[x]'
      );
      expect(snapRelationValue).toMatchObject(diffRelationValue);

      const diffLinkUrl = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:url'
      );
      expect(diffLinkUrl).toEqual({
        id: 'Extension.extension:url',
        path: 'Extension.extension',
        sliceName: 'url',
        short: 'Reference details for the link',
        definition: 'The reference details for the link.',
        min: 1,
        max: '1',
        type: [{ code: 'Extension' }]
      });
      const snapLinkUrl = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:url'
      );
      expect(snapLinkUrl).toMatchObject(diffLinkUrl);

      const diffUrlURL = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:url.url'
      );
      expect(diffUrlURL).toEqual({
        id: 'Extension.extension:url.url',
        path: 'Extension.extension.url',
        fixedUri: 'url'
      });
      const snapUrlURL = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:url.url'
      );
      expect(snapUrlURL).toMatchObject(diffUrlURL);

      const diffUrlValue = ext.differential?.element?.find(
        (e: any) => e.id === 'Extension.extension:url.value[x]'
      );
      expect(diffUrlValue).toEqual({
        id: 'Extension.extension:url.value[x]',
        path: 'Extension.extension.value[x]',
        type: [{ code: 'uri' }]
      });
      const snapUrlValue = ext.snapshot?.element?.find(
        (e: any) => e.id === 'Extension.extension:url.value[x]'
      );
      expect(snapUrlValue).toMatchObject(diffUrlValue);

      expect(loggerSpy.getAllLogs('warn')).toHaveLength(0);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });
  });
});
