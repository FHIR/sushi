import fs from 'fs-extra';
import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinition, ElementDefinitionType } from '../../src/fhirtypes/ElementDefinition';
import { loggerSpy, TestFisher } from '../testhelpers';
import { FshCode, Invariant, Logical, Resource } from '../../src/fshtypes';
import { Type } from '../../src/utils/Fishable';
import { AddElementRule, ObeysRule, OnlyRule } from '../../src/fshtypes/rules';
import { InstanceDefinition } from '../../src/fhirtypes';
import { FSHDocument, FSHTank } from '../../src/import';
import { minimalConfig } from '../utils/minimalConfig';
import { Package, StructureDefinitionExporter } from '../../src/export';
import { ValidationError } from '../../src/errors';
import { cloneDeep } from 'lodash';

describe('StructureDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  let jsonModifiedObservation: any;
  let modifiedObservation: StructureDefinition;
  let jsonPlanDefinition: any;
  let planDefinition: StructureDefinition;
  let resprate: StructureDefinition;
  let usCoreObservation: StructureDefinition;
  let jsonUsCoreObservation: StructureDefinition;
  let fisher: TestFisher;

  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
    // resolve observation once to ensure it is present in defs
    observation = fisher.fishForStructureDefinition('Observation');
    jsonObservation = defs.fishForFHIR('Observation', Type.Resource);
    jsonModifiedObservation = cloneDeep(jsonObservation);
    jsonModifiedObservation._baseDefinition = {
      id: 'baseDefinition-extension',
      extension: [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
          valueString: 'MetadataResource'
        }
      ]
    };
    usCoreObservation = fisher.fishForStructureDefinition('us-core-observation-lab');
    jsonUsCoreObservation = defs.fishForFHIR('us-core-observation-lab', Type.Profile);
    planDefinition = fisher.fishForStructureDefinition('PlanDefinition');
    jsonPlanDefinition = defs.fishForFHIR('PlanDefinition', Type.Resource);
  });

  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    modifiedObservation = StructureDefinition.fromJSON(jsonModifiedObservation);
    planDefinition = StructureDefinition.fromJSON(jsonPlanDefinition);
    usCoreObservation = StructureDefinition.fromJSON(jsonUsCoreObservation);
    resprate = fisher.fishForStructureDefinition('resprate');
  });

  describe('#fromJSON', () => {
    it('should load a resource properly', () => {
      // Don't test everything, but get a sample anyway
      expect(observation.id).toBe('Observation');
      expect(observation.meta.lastUpdated).toBe('2019-11-01T09:29:23.356+11:00');
      expect(observation.extension).toHaveLength(6);
      expect(observation.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      });
      expect(observation.elements).toHaveLength(50);
      const valueX = observation.elements[21];
      expect(valueX.hasDiff()).toBeFalsy();
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        new ElementDefinitionType('Quantity'),
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('string'),
        new ElementDefinitionType('boolean'),
        new ElementDefinitionType('integer'),
        new ElementDefinitionType('Range'),
        new ElementDefinitionType('Ratio'),
        new ElementDefinitionType('SampledData'),
        new ElementDefinitionType('time'),
        new ElementDefinitionType('dateTime'),
        new ElementDefinitionType('Period')
      ]);
    });

    it('should load a resource properly when there are ids and extensions on primitives', () => {
      // Don't test everything, but get a sample anyway
      expect(modifiedObservation.id).toBe('Observation');
      expect(modifiedObservation.baseDefinition).toBe(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
      // @ts-ignore
      expect(modifiedObservation._baseDefinition).toEqual({
        id: 'baseDefinition-extension',
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
            valueString: 'MetadataResource'
          }
        ]
      });
    });

    it('should load a resource properly without capturing originals', () => {
      observation = StructureDefinition.fromJSON(jsonObservation, false);
      // Don't test everything, but get a sample anyway
      expect(observation.id).toBe('Observation');
      expect(observation.meta.lastUpdated).toBe('2019-11-01T09:29:23.356+11:00');
      expect(observation.extension).toHaveLength(6);
      expect(observation.extension[0]).toEqual({
        url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
        valueString: 'Clinical.Diagnostics'
      });
      expect(observation.elements).toHaveLength(50);
      const valueX = observation.elements[21];
      expect(valueX.hasDiff()).toBeTruthy();
      expect(valueX.calculateDiff()).toEqual(valueX);
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        new ElementDefinitionType('Quantity'),
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('string'),
        new ElementDefinitionType('boolean'),
        new ElementDefinitionType('integer'),
        new ElementDefinitionType('Range'),
        new ElementDefinitionType('Ratio'),
        new ElementDefinitionType('SampledData'),
        new ElementDefinitionType('time'),
        new ElementDefinitionType('dateTime'),
        new ElementDefinitionType('Period')
      ]);
    });

    it('should throw a MissingSnapshotError when the StructureDefinition to load is missing a snapshot', () => {
      const noSnapshotJsonObservation = defs.fishForFHIR('Observation', Type.Resource);
      delete noSnapshotJsonObservation.snapshot;
      expect(() => StructureDefinition.fromJSON(noSnapshotJsonObservation)).toThrow(
        /http:\/\/hl7.org\/fhir\/StructureDefinition\/Observation is missing a snapshot/
      );
    });
  });

  describe('#toJSON', () => {
    it('should round trip back to the original JSON (excepting differentials)', () => {
      const oldJSON = cloneDeep(jsonObservation);
      const newJSON = observation.toJSON();
      // Because of the way we do differentials, those won't come back the same,
      // so remove differentials before comparing.
      delete oldJSON.differential;
      delete newJSON.differential;
      expect(newJSON).toEqual(oldJSON);
    });

    it('should round trip back to the original JSON when there are ids and extensions on primitives (excepting differentials)', () => {
      const oldJSON = cloneDeep(jsonModifiedObservation);
      const newJSON = modifiedObservation.toJSON();
      // Because of the way we do differentials, those won't come back the same,
      // so remove differentials before comparing.
      delete oldJSON.differential;
      delete newJSON.differential;
      expect(newJSON).toEqual(oldJSON);
    });

    it('should reflect differentials for elements that changed after capturing originals', () => {
      const code = usCoreObservation.elements.find(e => e.id === 'Observation.code');
      code.short = 'Special observation code';
      const valueX = usCoreObservation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.min = 1;

      const json = usCoreObservation.toJSON();
      expect(json.differential.element).toHaveLength(2);
      expect(json.differential.element[0]).toEqual({
        id: 'Observation.code',
        path: 'Observation.code',
        short: 'Special observation code'
      });
      expect(json.differential.element[1]).toEqual({
        id: 'Observation.value[x]',
        path: 'Observation.value[x]',
        min: 1
      });
    });

    it('should reflect differentials for elements that changed after capturing originals without generating snapshot', () => {
      const code = usCoreObservation.elements.find(e => e.id === 'Observation.code');
      code.short = 'Special observation code';
      const valueX = usCoreObservation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.min = 1;

      const json = usCoreObservation.toJSON(false);
      expect(json.differential.element).toHaveLength(2);
      expect(json.differential.element[0]).toEqual({
        id: 'Observation.code',
        path: 'Observation.code',
        short: 'Special observation code'
      });
      expect(json.differential.element[1]).toEqual({
        id: 'Observation.value[x]',
        path: 'Observation.value[x]',
        min: 1
      });
      expect(json.snapshot).toBeUndefined();
    });

    it('should generate sparse differentials', () => {
      const componentCode = usCoreObservation.elements.find(
        e => e.id === 'Observation.component.code'
      );
      componentCode.short = 'Special component code';

      const json = usCoreObservation.toJSON();
      expect(json.differential.element).toHaveLength(1);
      expect(json.differential.element[0]).toEqual({
        id: 'Observation.component.code',
        path: 'Observation.component.code',
        short: 'Special component code'
      });
    });

    it('should reflect basic differential for structure definitions with no changes', () => {
      const json = usCoreObservation.toJSON();
      expect(json.differential).toEqual({ element: [{ id: 'Observation', path: 'Observation' }] });
    });

    it('should reflect basic differential for structure definitions with no changes without generating snapshot', () => {
      const json = usCoreObservation.toJSON(false);
      expect(json.differential).toEqual({ element: [{ id: 'Observation', path: 'Observation' }] });
      expect(json.snapshot).toBeUndefined();
    });

    it('should properly serialize snapshot and differential for constrained choice type with constraints on specific choices', () => {
      // constrain value[x] to only a Quantity or string and give each its own short
      const valueX = usCoreObservation.elements.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]'
      );
      valueX.sliceIt('type', '$this', false, 'open');
      const valueConstraint = new OnlyRule('value[x]');
      valueConstraint.types = [{ type: 'Quantity' }, { type: 'string' }];
      valueX.constrainType(valueConstraint, fisher);
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = usCoreObservation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]'
      );
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toEqual([{ code: 'Quantity' }, { code: 'string' }]);
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueQuantity'
      );
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueString'
      );
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check the differential
      expect(json.differential.element).toHaveLength(3);
      const valueXDiff = json.differential.element[0];
      expect(valueXDiff).toEqual({
        id: 'Observation.value[x]',
        path: 'Observation.value[x]',
        type: [{ code: 'Quantity' }, { code: 'string' }],
        slicing: {
          discriminator: [{ type: 'type', path: '$this' }],
          ordered: false,
          rules: 'open'
        }
      });
      const valueQuantityDiff = json.differential.element[1];
      expect(valueQuantityDiff.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.value[x]');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBe('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[2];
      expect(valueStringDiff.id).toBe('Observation.value[x]:valueString');
      expect(valueStringDiff.path).toBe('Observation.value[x]');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBe('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
    });

    it('should properly serialize snapshot and differential for unconstrained choice type with constraints on specific choices', () => {
      const valueX = usCoreObservation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.sliceIt('type', '$this', false, 'open');
      // note: NOT constraining value[x] types.  Just adding specific elements for valueQuantity and valueString.
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = usCoreObservation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]'
      );
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toHaveLength(11);
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueQuantity'
      );
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueString'
      );
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check the differential
      expect(json.differential.element).toHaveLength(3);
      const valueXDiff = json.differential.element[0];
      expect(valueXDiff.id).toBe('Observation.value[x]');
      expect(valueXDiff.path).toBe('Observation.value[x]');
      expect(valueXDiff.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantityDiff = json.differential.element[1];
      expect(valueQuantityDiff.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.value[x]');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBe('valueQuantity');
      expect(valueQuantityDiff.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[2];
      expect(valueStringDiff.id).toBe('Observation.value[x]:valueString');
      expect(valueStringDiff.path).toBe('Observation.value[x]');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBe('valueString');
      expect(valueStringDiff.short).toBe('the string choice');
    });

    it('should properly serialize snapshot and differential for choice type with non-type constraint and with constraints on specific choices', () => {
      // This is the same test as above, but we add a non-type constraint on value[x] to make sure it doesn't get
      // blindly thrown away just because it doesn't constrain the types
      const valueX = usCoreObservation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.short = 'a choice of many things';
      valueX.sliceIt('type', '$this', false, 'open');
      // note: NOT constraining value[x] types.  Just adding specific elements for valueQuantity and valueString.
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = usCoreObservation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]'
      );
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toHaveLength(11);
      expect(valueXSnapshot.short).toBe('a choice of many things');
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueQuantity'
      );
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element.find(
        (e: ElementDefinition) => e.id === 'Observation.value[x]:valueString'
      );
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check the differential
      expect(json.differential.element).toHaveLength(3);
      const valueXDiff = json.differential.element[0];
      expect(valueXDiff).toEqual({
        id: 'Observation.value[x]',
        path: 'Observation.value[x]',
        slicing: {
          discriminator: [{ type: 'type', path: '$this' }],
          ordered: false,
          rules: 'open'
        },
        short: 'a choice of many things'
      });
      const valueQuantityDiff = json.differential.element[1];
      expect(valueQuantityDiff.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.value[x]');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBe('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[2];
      expect(valueStringDiff.id).toBe('Observation.value[x]:valueString');
      expect(valueStringDiff.path).toBe('Observation.value[x]');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBe('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
    });

    it('should properly serialize snapshot and differential for constraints on children of slices', () => {
      // element doesnt yet exist, must be added
      resprate.findElementByPath('category.coding', fisher);
      let json = resprate.toJSON();
      const vsCatOriginal = json.snapshot.element[18];
      const vsCatCodingOriginal = json.snapshot.element[21];
      const catOriginal = json.snapshot.element[13];
      const catCodingOriginal = json.snapshot.element[16];

      const vsCatCodingSD = resprate.elements.find(
        e => e.id === 'Observation.category:VSCat.coding'
      );
      vsCatCodingSD.short = 'Hello I am a change';
      const catCodingSD = resprate.elements.find(e => e.id === 'Observation.category.coding');
      vsCatCodingSD.short = 'Hello I am a change';
      catCodingSD.short = 'Hello I am also a change';

      json = resprate.toJSON();
      const vsCat = json.snapshot.element[18];
      const vsCatCoding = json.snapshot.element[21];
      const cat = json.snapshot.element[13];
      const catCoding = json.snapshot.element[16];

      // Check Observation.category:VSCat and Observation.category:VSCat.coding elements on the snapshot
      expect(vsCatCoding.short).toBe('Hello I am a change');
      delete vsCatCoding.short;
      delete vsCatCodingOriginal.short;
      expect(vsCatCoding).toEqual(vsCatCodingOriginal);
      expect(vsCat).toEqual(vsCatOriginal);
      expect(catCoding.short).toBe('Hello I am also a change');
      delete catCoding.short;
      delete catCodingOriginal.short;
      expect(catCoding).toEqual(catCodingOriginal);
      expect(cat).toEqual(catOriginal);

      const vsCatCodingDiff = json.differential.element[3];
      const vsCatDiff = json.differential.element[2];
      expect(vsCatCodingDiff).toEqual({
        id: 'Observation.category:VSCat.coding',
        path: 'Observation.category.coding',
        short: 'Hello I am a change'
      });
      expect(vsCatDiff).toEqual({
        id: 'Observation.category:VSCat',
        path: 'Observation.category',
        sliceName: 'VSCat'
      });

      const catCodingDiff = json.differential.element[1];
      const catDiff = json.differential.element[0];
      expect(catCodingDiff).toEqual({
        id: 'Observation.category.coding',
        path: 'Observation.category.coding',
        short: 'Hello I am also a change'
      });
      expect(catDiff).toEqual({
        id: 'Observation.category',
        path: 'Observation.category'
      });
    });

    describe('#toJson - Logicals and Resources', () => {
      let addElementRule1: AddElementRule;
      let addElementRule2: AddElementRule;
      let invariant: Invariant;
      let doc: FSHDocument;
      let exporter: StructureDefinitionExporter;

      beforeAll(() => {
        addElementRule1 = new AddElementRule('prop1');
        addElementRule1.min = 0;
        addElementRule1.max = '1';
        addElementRule1.types = [{ type: 'dateTime' }];
        addElementRule1.short = 'property1 dateTime';

        addElementRule2 = new AddElementRule('prop2');
        addElementRule2.min = 0;
        addElementRule2.max = '*';
        addElementRule2.types = [{ type: 'string' }];
        addElementRule2.short = 'property2 string';
      });

      beforeEach(() => {
        loggerSpy.reset();
        doc = new FSHDocument('fileName');
        invariant = new Invariant('TestInvariant');
        doc.invariants.set(invariant.name, invariant);

        const input = new FSHTank([doc], minimalConfig);
        const pkg = new Package(input.config);
        const fisher = new TestFisher(input, defs, pkg);
        exporter = new StructureDefinitionExporter(input, pkg, fisher);
      });

      it('should properly serialize snapshot and differential root elements for logical model', () => {
        const logical = new Logical('MyTestModel');
        logical.id = 'MyModel';
        logical.rules.push(addElementRule1);
        logical.rules.push(addElementRule2);
        doc.logicals.set(logical.name, logical);

        const exported = exporter.export().logicals;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(3);
        expect(json.differential.element).toHaveLength(3);

        const expectedSnapshotRootElement = {
          id: 'MyModel',
          path: 'MyModel',
          min: 0,
          max: '*',
          base: {
            path: 'MyModel',
            min: 0,
            max: '*'
          },
          constraint: [
            {
              key: 'ele-1',
              severity: 'error',
              human: 'All FHIR elements must have a @value or children',
              expression: 'hasValue() or (children().count() > id.count())',
              xpath: '@value|f:*|h:div',
              source: 'http://hl7.org/fhir/StructureDefinition/Element'
            }
          ],
          isModifier: false
        };
        expect(json.snapshot.element[0]).toStrictEqual(expectedSnapshotRootElement);

        const expectedDifferentialRootElement = {
          id: 'MyModel',
          path: 'MyModel'
        };
        expect(json.differential.element[0]).toStrictEqual(expectedDifferentialRootElement);
      });

      it('should properly serialize snapshot and differential elements with constraint for logical model', () => {
        const logical = new Logical('MyTestModel');
        logical.id = 'MyModel';
        logical.rules.push(addElementRule1);
        logical.rules.push(addElementRule2);
        const obeysRule = new ObeysRule('prop2');
        obeysRule.invariant = invariant.id;
        logical.rules.push(obeysRule);
        doc.logicals.set(logical.name, logical);

        const exported = exporter.export().logicals;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(3);
        expect(json.differential.element).toHaveLength(3);

        const prop2Snap = json.snapshot.element.find(
          (e: ElementDefinition) => e.path === 'MyModel.prop2'
        );
        expect(prop2Snap.constraint).toHaveLength(2);

        const prop2Diff = json.differential.element.find(
          (e: ElementDefinition) => e.path === 'MyModel.prop2'
        );
        expect(prop2Diff.constraint).toHaveLength(1);
        const expectedDiffConstraint = {
          key: 'TestInvariant',
          source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/MyModel'
        };
        expect(prop2Diff.constraint[0]).toStrictEqual(expectedDiffConstraint);
      });

      it('should properly serialize snapshot and differential root elements for resource', () => {
        const resource = new Resource('MyTestResource');
        resource.parent = 'Resource';
        resource.title = 'MyTestResource Title';
        resource.description = 'MyTestResource description goes here.';
        resource.id = 'MyResource';
        resource.rules.push(addElementRule1);
        resource.rules.push(addElementRule2);
        doc.resources.set(resource.name, resource);

        const exported = exporter.export().resources;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(7);
        expect(json.differential.element).toHaveLength(3);

        const expectedSnapshotRootElement = {
          id: 'MyResource',
          path: 'MyResource',
          short: 'MyTestResource Title',
          definition: 'MyTestResource description goes here.',
          min: 0,
          max: '*',
          base: {
            path: 'MyResource',
            min: 0,
            max: '*'
          },
          isModifier: false,
          isSummary: false,
          mapping: [
            {
              identity: 'rim',
              map: 'Entity. Role, or Act'
            }
          ]
        };
        expect(json.snapshot.element[0]).toStrictEqual(expectedSnapshotRootElement);

        const expectedDifferentialRootElement = {
          id: 'MyResource',
          path: 'MyResource',
          short: 'MyTestResource Title',
          definition: 'MyTestResource description goes here.'
        };
        expect(json.differential.element[0]).toStrictEqual(expectedDifferentialRootElement);
      });

      it('should properly serialize snapshot and differential elements with constraint for resource', () => {
        const resource = new Resource('MyTestResource');
        resource.parent = 'Resource';
        resource.title = 'MyTestResource Title';
        resource.description = 'MyTestResource description goes here.';
        resource.id = 'MyResource';
        resource.rules.push(addElementRule1);
        resource.rules.push(addElementRule2);
        const obeysRule = new ObeysRule('prop2');
        obeysRule.invariant = invariant.id;
        resource.rules.push(obeysRule);
        doc.resources.set(resource.name, resource);

        const exported = exporter.export().resources;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(7);
        expect(json.differential.element).toHaveLength(3);

        const prop2Snap = json.snapshot.element.find(
          (e: ElementDefinition) => e.path === 'MyResource.prop2'
        );
        expect(prop2Snap.constraint).toHaveLength(2);

        const prop2Diff = json.differential.element.find(
          (e: ElementDefinition) => e.path === 'MyResource.prop2'
        );
        expect(prop2Diff.constraint).toHaveLength(1);
        const expectedDiffConstraint = {
          key: 'TestInvariant',
          source: 'http://hl7.org/fhir/us/minimal/StructureDefinition/MyResource'
        };
        expect(prop2Diff.constraint[0]).toStrictEqual(expectedDiffConstraint);
      });

      it('should properly serialize snapshot and differential for logical model with parent set to Base', () => {
        const logical = new Logical('MyTestModel');
        logical.parent = 'Base';
        logical.id = 'MyModel';
        logical.rules.push(addElementRule1);
        logical.rules.push(addElementRule2);
        doc.logicals.set(logical.name, logical);

        const exported = exporter.export().logicals;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(3);
        expect(json.differential.element).toHaveLength(3);
      });

      it('should properly serialize snapshot and differential for logical model with parent set to Element', () => {
        const logical = new Logical('MyTestModel');
        logical.parent = 'Element';
        logical.id = 'MyModel';
        logical.rules.push(addElementRule1);
        logical.rules.push(addElementRule2);
        doc.logicals.set(logical.name, logical);

        const exported = exporter.export().logicals;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(5);
        expect(json.differential.element).toHaveLength(3);
      });

      it('should properly serialize snapshot and differential for logical model with parent set to AlternateIdentification', () => {
        const logical = new Logical('MyTestModel');
        logical.parent = 'AlternateIdentification';
        logical.id = 'MyModel';
        logical.rules.push(addElementRule1);
        logical.rules.push(addElementRule2);
        doc.logicals.set(logical.name, logical);

        const exported = exporter.export().logicals;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(8);
        expect(json.differential.element).toHaveLength(3);
      });

      it('should properly serialize snapshot and differential for custom resource with parent set to Resource', () => {
        const resource = new Resource('MyTestResource');
        resource.parent = 'Resource';
        resource.id = 'MyResource';
        resource.rules.push(addElementRule1);
        resource.rules.push(addElementRule2);
        doc.resources.set(resource.name, resource);

        const exported = exporter.export().resources;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(7);
        expect(json.differential.element).toHaveLength(3);
      });

      it('should properly serialize snapshot and differential for custom resource with parent set to DomainResource', () => {
        const resource = new Resource('MyTestResource');
        resource.parent = 'DomainResource';
        resource.id = 'MyResource';
        resource.rules.push(addElementRule1);
        resource.rules.push(addElementRule2);
        doc.resources.set(resource.name, resource);

        const exported = exporter.export().resources;
        expect(exported).toHaveLength(1);

        const json = exported[0].toJSON(true);
        expect(json).toBeDefined();
        expect(json.snapshot.element).toHaveLength(11);
        expect(json.differential.element).toHaveLength(3);
      });
    });
  });

  describe('#newElement', () => {
    it('should add a new element to the SD', () => {
      observation.newElement('extra');
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[50].id).toBe('Observation.extra');
      expect(observation.elements[50].path).toBe('Observation.extra');
    });
  });

  describe('#addElement', () => {
    it('should add an element in the right place', () => {
      observation.addElement(new ElementDefinition('Observation.meta.id'));
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[3].id).toBe('Observation.meta.id');
    });

    it('should add an element in the right place even with substrings involved', () => {
      // Tests bug reported here: https://github.com/FHIR/sushi/issues/122
      observation.addElement(new ElementDefinition('Observation.component:FooBefore'));
      observation.addElement(new ElementDefinition('Observation.component:Foo'));
      observation.addElement(new ElementDefinition('Observation.component:FooAfter'));
      observation.addElement(new ElementDefinition('Observation.component:Foo.id'));
      observation.addElement(new ElementDefinition('Observation.component:FooAfter.id'));
      observation.addElement(new ElementDefinition('Observation.component:FooBefore.id'));
      expect(observation.elements).toHaveLength(56);
      const getIdx = (id: string) => {
        return observation.elements.findIndex(e => e.id === id);
      };
      expect(getIdx('Observation.component')).toBe(41);
      expect(getIdx('Observation.component:FooBefore')).toBe(50);
      expect(getIdx('Observation.component:FooBefore.id')).toBe(51);
      expect(getIdx('Observation.component:Foo')).toBe(52);
      expect(getIdx('Observation.component:Foo.id')).toBe(53);
      expect(getIdx('Observation.component:FooAfter')).toBe(54);
      expect(getIdx('Observation.component:FooAfter.id')).toBe(55);
    });

    it('should add explicit choice element in the right place', () => {
      observation.addElement(new ElementDefinition('Observation.value[x]:valueQuantity'));
      expect(observation.elements).toHaveLength(51);
      expect(observation.elements[22].id).toBe('Observation.value[x]:valueQuantity');
    });

    it('should add children of sliced elements in the right place', () => {
      const originalLength = resprate.elements.length;
      resprate.addElement(new ElementDefinition('Observation.category.coding'));
      expect(resprate.elements).toHaveLength(originalLength + 1);
      expect(resprate.elements[14].id).toBe('Observation.category.coding');
    });

    it('should add resliced elements in the right place', () => {
      const originalLength = resprate.elements.length;
      resprate.addElement(new ElementDefinition('Observation.category:VSCat/foo'));
      expect(resprate.elements).toHaveLength(originalLength + 1);
      expect(resprate.elements[26].id).toBe('Observation.category:VSCat/foo');
    });

    it('should add children of resliced elements in the right place', () => {
      const originalLength = resprate.elements.length;
      resprate.addElement(new ElementDefinition('Observation.category:VSCat/foo'));
      resprate.addElement(new ElementDefinition('Observation.category:VSCat/foo/bar'));
      resprate.addElement(new ElementDefinition('Observation.category:VSCat/foo.extension'));
      expect(resprate.elements).toHaveLength(originalLength + 3);
      expect(resprate.elements[26].id).toBe('Observation.category:VSCat/foo');
      expect(resprate.elements[27].id).toBe('Observation.category:VSCat/foo.extension');
      expect(resprate.elements[28].id).toBe('Observation.category:VSCat/foo/bar');
    });
  });

  describe('#findElement', () => {
    it('should find an element by id', () => {
      const valueX = observation.findElement('Observation.value[x]');
      expect(valueX).toBeDefined();
      expect(valueX.short).toBe('Actual result');
    });
  });

  describe('#findElementByPath', () => {
    let respRate: StructureDefinition;
    let lipidProfile: StructureDefinition;
    let clinicalDocument: StructureDefinition;
    let valueSet: StructureDefinition;
    beforeEach(() => {
      respRate = fisher.fishForStructureDefinition('resprate');
      lipidProfile = fisher.fishForStructureDefinition('lipidprofile');
      clinicalDocument = fisher.fishForStructureDefinition('clinicaldocument');
      valueSet = fisher.fishForStructureDefinition('ValueSet');
    });

    // Simple paths (no brackets)
    it('should find an element by a path that exists', () => {
      const status = observation.findElementByPath('status', fisher);
      expect(status).toBeDefined();
      expect(status.id).toBe('Observation.status');
    });

    it('should find a choice element by a path that exists', () => {
      const valueX = observation.findElementByPath('value[x]', fisher);
      expect(valueX).toBeDefined();
      expect(valueX.id).toBe('Observation.value[x]');
    });

    it('should find an element with children by a path that exists', () => {
      const refRange = respRate.findElementByPath('referenceRange', fisher);
      expect(refRange).toBeDefined();
      expect(refRange.id).toBe('Observation.referenceRange');
    });

    it('should find a child element by a path that exists', () => {
      const refRangeLow = respRate.findElementByPath('referenceRange.low', fisher);
      expect(refRangeLow).toBeDefined();
      expect(refRangeLow.id).toBe('Observation.referenceRange.low');
    });

    it('should find the base element by an empty path', () => {
      const observationElement = observation.findElementByPath('', fisher);
      expect(observationElement).toBeDefined();
      expect(observationElement.id).toBe('Observation');
    });

    it('should not find an element by non-existent path', () => {
      const undefinedEl = observation.findElementByPath('foo', fisher);
      expect(undefinedEl).toBeUndefined();
    });

    // References
    it('should find a reference choice by path', () => {
      const basedOnNoChoice = observation.findElementByPath('basedOn', fisher);
      const basedOnChoice = observation.findElementByPath('basedOn[MedicationRequest]', fisher);
      expect(basedOnChoice).toBeDefined();
      expect(basedOnChoice.id).toBe('Observation.basedOn');
      expect(basedOnChoice).toBe(basedOnNoChoice);
    });

    it('should not find an incorrect reference choice by path', () => {
      const basedOn = observation.findElementByPath('basedOn[foo]', fisher);
      expect(basedOn).toBeUndefined();
    });

    // Slicing
    it('should find a sliced element by path', () => {
      const VSCat = respRate.findElementByPath('category[VSCat]', fisher);
      expect(VSCat).toBeDefined();
      expect(VSCat.id).toBe('Observation.category:VSCat');
    });

    it('should find a sliced element by path when a previous element in a different slice has a child w/ the same slice name', () => {
      // This test is intended to reproduce the problematic edge case in this issue: https://github.com/FHIR/sushi/issues/956
      const Cat = respRate.findElement('Observation.category');
      Cat.addSlice('CommonName');

      const VSCatCoding = respRate.findElement('Observation.category:VSCat.coding');
      VSCatCoding.slicing = { discriminator: [{ type: 'pattern', path: '$this' }], rules: 'open' };
      VSCatCoding.addSlice('CommonName');

      const VSCat = respRate.findElementByPath('category[CommonName]', fisher);
      expect(VSCat).toBeDefined();
      expect(VSCat.id).toBe('Observation.category:CommonName');
    });

    it('should find a child of a sliced element by path', () => {
      const VSCatID = respRate.findElementByPath('category[VSCat].id', fisher);
      expect(VSCatID).toBeDefined();
      expect(VSCatID.id).toBe('Observation.category:VSCat.id');
    });

    it('should find a root of a slicing that is a child of a slice by path', () => {
      const VSCatCoding = respRate.findElement('Observation.category:VSCat.coding');
      VSCatCoding.slicing = { discriminator: [{ type: 'pattern', path: '$this' }], rules: 'open' };
      VSCatCoding.addSlice('TestSlice');
      const testSlice = respRate.findElement('Observation.category:VSCat.coding:TestSlice');
      expect(testSlice).toBeDefined();
      const foundTestSlice = respRate.findElementByPath(
        'category[VSCat].coding[TestSlice]',
        fisher
      );
      const foundRoot = respRate.findElementByPath('category[VSCat].coding', fisher);
      expect(foundTestSlice).toBeDefined();
      expect(foundTestSlice.id).toBe('Observation.category:VSCat.coding:TestSlice');
      expect(foundRoot).toBeDefined();
      expect(foundRoot.id).toBe('Observation.category:VSCat.coding');
    });

    it('should find a child that must be unrolled of an element with slices that contain the name of that element', () => {
      const coding = respRate.findElement('Observation.code.coding');
      // the codingSlice slice contains the name of the base element, coding, this was causing unrolling of children to fail
      // since the codingSlice element was not correctly differentiated from the code.coding element
      coding.addSlice('codingSlice');
      const codingSliceId = respRate.findElementByPath('code.coding.system.id', fisher);
      expect(codingSliceId).toBeDefined();
    });

    it('should find a slice that only exists on a sliced element child', () => {
      const coding = respRate.findElementByPath('category.coding', fisher);
      coding.slicing = {
        discriminator: [{ type: 'pattern', path: '$this' }],
        rules: 'open'
      };
      coding.addSlice('RegularSlice');
      const originalLength = respRate.elements.length;
      const root = respRate.findElement('Observation.category:VSCat.coding');
      const slice = respRate.findElementByPath('category[VSCat].coding[RegularSlice]', fisher);
      expect(slice).toBeDefined();
      expect(slice.id).toBe('Observation.category:VSCat.coding:RegularSlice');
      expect(root.slicing).toEqual(coding.slicing);
      expect(respRate.elements.length).toBe(originalLength + 1);
    });

    it('should find a slice that only exists on a sliced element grandchild', () => {
      const id = respRate.findElementByPath('category.coding.id', fisher);
      id.slicing = {
        discriminator: [{ type: 'pattern', path: '$this' }],
        rules: 'open'
      };
      id.addSlice('RegularSlice');
      const originalLength = respRate.elements.length;
      const root = respRate.findElement('Observation.category:VSCat.coding.id');
      const slice = respRate.findElementByPath('category[VSCat].coding.id[RegularSlice]', fisher);
      expect(root.slicing).toEqual(id.slicing);
      expect(slice).toBeDefined();
      expect(slice.id).toBe('Observation.category:VSCat.coding.id:RegularSlice');
      expect(respRate.elements.length).toBe(originalLength + 1);
    });

    it('should not find a slice that does not exist on a sliced root child', () => {
      const regularCoding = respRate.findElementByPath('category.coding', fisher);
      regularCoding.slicing = {
        discriminator: [{ type: 'pattern', path: '$this' }],
        rules: 'open'
      };
      regularCoding.addSlice('RegularSlice');
      const originalLength = respRate.elements.length;
      const root = respRate.findElement('Observation.category:VSCat.coding');
      const slice = respRate.findElementByPath('category[VSCat].coding[IrregularSlice]', fisher);
      expect(root.slicing).toBeUndefined();
      expect(slice).toBeUndefined();
      expect(respRate.elements.length).toBe(originalLength);
    });

    it('should find an element that is the grandchild or deeper descendant of an element that has a slice with the same name as the ancestor element', () => {
      const component = respRate.findElementByPath('component', fisher);
      component.slicing = {
        discriminator: [{ type: 'pattern', path: '$this' }],
        rules: 'open'
      };
      component.addSlice('component');
      // force an unfolding by finding a descendant of the slice
      respRate.findElementByPath('component[component].dataAbsentReason', fisher);
      const descendant = respRate.findElementByPath('component.referenceRange.low', fisher);
      expect(descendant).toBeDefined();
    });

    it('should find a re-sliced element by path', () => {
      const jsonReslice = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../testhelpers/testdefs/patient-telecom-reslice-profile.json'),
          'utf-8'
        )
      );
      const reslice = StructureDefinition.fromJSON(jsonReslice);
      const emailWorkEmail = reslice.findElementByPath('telecom[email][workEmail]', fisher);
      expect(emailWorkEmail).toBeDefined();
      expect(emailWorkEmail.sliceName).toBe('email/workEmail');
    });

    it('should not crash when trying to find a non-existent slice containing elements without a type', () => {
      // component.referenceRange does not have a type, this test verifies that this does not cause a crash
      const componentFooSlice = observation.findElementByPath('component[FooSlice]', fisher);
      expect(componentFooSlice).toBeUndefined();
    });

    it('should find a child of a sliced element by path with URL', () => {
      const originalLength = clinicalDocument.elements.length;
      const valueString = clinicalDocument.findElementByPath(
        'extension[http://hl7.org/fhir/StructureDefinition/composition-clinicaldocument-versionNumber].value[x]',
        fisher
      );
      expect(valueString).toBeDefined();
      expect(valueString.id).toBe('Composition.extension:versionNumber.value[x]');
      expect(clinicalDocument.elements.length).toBe(originalLength + 4);
    });

    // Choices
    it('should make explicit a non-existent choice element by path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      expect(valueX.slicing).toBeUndefined();
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(valueX.slicing.ordered).toBe(false);
      expect(valueX.slicing.rules).toBe('open');
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should preserve existing slicing when making a non-existent choice element explicit', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      expect(valueX.slicing).toBeUndefined();
      valueX.slicing = { ordered: true, rules: 'closed' };
      observation.findElementByPath('valueQuantity', fisher);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(valueX.slicing.ordered).toBe(true);
      expect(valueX.slicing.rules).toBe('closed');
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should make explicit a non-existent choice element that must first be unfolded', () => {
      const originalLength = observation.elements.length;
      const valueQuantity = observation.findElementByPath('extension.valueQuantity', fisher);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.extension.value[x]:valueQuantity');
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.extension.value[x]');
      expect(observation.elements.length).toBe(originalLength + 5);
    });

    it('should make explicit a non-existent choice element by child path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      expect(valueX.slicing).toBeUndefined();
      const valueQuantitySystem = observation.findElementByPath('valueQuantity.system', fisher);
      expect(valueQuantitySystem).toBeDefined();
      expect(valueQuantitySystem.id).toBe('Observation.value[x]:valueQuantity.system');
      expect(valueQuantitySystem.path).toBe('Observation.value[x].system');
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(observation.elements.length).toBe(originalLength + 8);
    });

    it('should find an already existing explicit choice element with slicing syntax', () => {
      const originalLength = respRate.elements.length;
      const valueQuantity = respRate.findElementByPath('value[x][valueQuantity]', fisher);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(respRate.elements.length).toBe(originalLength);
    });

    it('should find an already existing explicit choice element with name replacement syntax', () => {
      const originalLength = respRate.elements.length;
      const valueQuantity = respRate.findElementByPath('valueQuantity', fisher);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(respRate.elements.length).toBe(originalLength);
    });

    it('should not create a slicing or slice for single-choice elements when finding it by a type-specific path ', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.type = [new ElementDefinitionType('Quantity')];
      // Since there is only one possible choice, it should return the choice element directly
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      expect(valueX.slicing).toBeUndefined();
      expect(valueQuantity).toBe(valueX);
      expect(valueQuantity.id).toBe('Observation.value[x]');
      expect(observation.elements.length).toBe(originalLength);
    });

    it('should not create a slicing or slice for single-choice elements when finding it by a type-specific path to a child element ', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.type = [new ElementDefinitionType('Quantity')];
      // Since there is only one possible choice, it should return the choice element directly
      const valueQuantityUnit = observation.findElementByPath('valueQuantity.unit', fisher);
      expect(valueX.slicing).toBeUndefined();
      expect(valueQuantityUnit).toBeDefined();
      expect(valueQuantityUnit.parent()).toBe(valueX);
      expect(valueQuantityUnit.id).toBe('Observation.value[x].unit');
      expect(observation.elements.length).toBe(originalLength + 7); // Plus 7 for unfolded Quantity elements
    });

    it('should create a slicing and slice for two-choice elements when finding it by a type-specific path', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.type = [
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('Quantity')
      ];
      // Since there is more than one choice, it should slice to distinguish between them
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(valueX.slicing.ordered).toBe(false);
      expect(valueX.slicing.rules).toBe('open');
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should create a slicing and slice for two-choice elements when finding it by a type-specific path to a child element', () => {
      const originalLength = observation.elements.length;
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.type = [
        new ElementDefinitionType('CodeableConcept'),
        new ElementDefinitionType('Quantity')
      ];
      // Since there is more than one choice, it should slice to distinguish between them
      const valueQuantityUnit = observation.findElementByPath('valueQuantity.unit', fisher);
      expect(valueX.slicing).toBeDefined();
      expect(valueX.slicing.discriminator[0]).toEqual({ type: 'type', path: '$this' });
      expect(valueX.slicing.ordered).toBe(false);
      expect(valueX.slicing.rules).toBe('open');
      expect(valueQuantityUnit).toBeDefined();
      expect(valueQuantityUnit.id).toBe('Observation.value[x]:valueQuantity.unit');
      const valueQuantity = valueQuantityUnit.parent();
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(observation.elements.length).toBe(originalLength + 8); // Plus 8 for slice and unfolded Quantity elements
    });

    it('should create a slice for single-choice elements with other existing slices when finding it by a type-specific path', () => {
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.sliceIt('type', '$this', false, 'open');
      valueX.addSlice('valueCodeableConcept', new ElementDefinitionType('valueCodeableConcept'));
      valueX.type = [new ElementDefinitionType('Quantity')];
      const originalLength = observation.elements.length;
      // Since there are already other slices, even though this is now a single-choice,
      // it should create a new slice to be consistent with what's already there.
      // (This was a subjective decision on our part, not necessarily driven be spec).
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      expect(valueQuantity).toBeDefined();
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(observation.elements.length).toBe(originalLength + 1);
    });

    it('should create a slice for single-choice elements with other existing slices when finding it by a type-specific path to a child element ', () => {
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.sliceIt('type', '$this', false, 'open');
      valueX.addSlice('valueCodeableConcept', new ElementDefinitionType('valueCodeableConcept'));
      valueX.type = [new ElementDefinitionType('Quantity')];
      const originalLength = observation.elements.length;
      // Since there are already other slices, even though this is now a single-choice,
      // it should create a new slice to be consistent with what's already there.
      // (This was a subjective decision on our part, not necessarily driven be spec).
      const valueQuantityUnit = observation.findElementByPath('valueQuantity.unit', fisher);
      expect(valueQuantityUnit).toBeDefined();
      expect(valueQuantityUnit.id).toBe('Observation.value[x]:valueQuantity.unit');
      const valueQuantity = valueQuantityUnit.parent();
      expect(valueQuantity.slicing).toBeUndefined();
      expect(valueQuantity.sliceName).toBe('valueQuantity');
      expect(valueQuantity.path).toBe('Observation.value[x]');
      expect(valueQuantity.min).toBe(0);
      expect(observation.elements.length).toBe(originalLength + 8); // Plus 8 for slice and unfolded Quantity elements
    });

    it('should return a pre-existing slice for single-choice elements when finding it by a type-specific path', () => {
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.sliceIt('type', '$this', false, 'open');
      valueX.type = [new ElementDefinitionType('Quantity')];
      const slice = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      const originalLength = observation.elements.length;
      // Since a slice for Quantity already exists, it should return that slice directly
      const valueQuantity = observation.findElementByPath('valueQuantity', fisher);
      expect(valueQuantity).toBe(slice);
      expect(valueQuantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(observation.elements.length).toBe(originalLength);
    });

    it('should return a pre-existing slice for single-choice elements when finding it by a type-specific path to a child element', () => {
      const valueX = observation.findElementByPath('value[x]', fisher);
      valueX.sliceIt('type', '$this', false, 'open');
      valueX.type = [new ElementDefinitionType('Quantity')];
      const slice = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      const originalLength = observation.elements.length;
      // Since a slice for Quantity already exists, it should return that slice directly
      const valueQuantityUnit = observation.findElementByPath('valueQuantity.unit', fisher);
      expect(valueQuantityUnit).toBeDefined();
      expect(valueQuantityUnit.parent()).toBe(slice);
      expect(valueQuantityUnit.id).toBe('Observation.value[x]:valueQuantity.unit');
      expect(observation.elements.length).toBe(originalLength + 7); // Plus 7 for unfolded Quantity elements
    });

    // Unfolding
    it('should find an element that must be unfolded by path', () => {
      const originalLength = observation.elements.length;
      const codeText = observation.findElementByPath('code.text', fisher);
      expect(codeText).toBeDefined();
      expect(codeText.id).toBe('Observation.code.text');
      expect(codeText.short).toBe('Plain text representation of the concept');
      expect(observation.elements.length).toBe(originalLength + 4);
    });

    it('should find an element that must be unfolded from the Structure Definition by path', () => {
      const originalLength = observation.elements.length;
      const component = observation.elements.find(e => e.id === 'Observation.component');
      component.slicing = {
        ordered: false,
        rules: 'open',
        discriminator: [{ type: 'value', path: 'code' }]
      };
      component.addSlice('FooSlice');
      const componentCode = observation.findElementByPath('component[FooSlice].code', fisher);
      expect(componentCode).toBeDefined();
      expect(componentCode.id).toBe('Observation.component:FooSlice.code');
      expect(componentCode.path).toBe('Observation.component.code');
      expect(observation.elements.length).toBe(originalLength + 9);
    });

    it('should find an element, whose name is contained in another element, that must be unfolded', () => {
      const originalLength = lipidProfile.elements.length;
      const resultDisplay = lipidProfile.findElementByPath('result.display', fisher);
      expect(resultDisplay).toBeDefined();
      expect(resultDisplay.id).toBe('DiagnosticReport.result.display');
      expect(lipidProfile.elements.length).toBe(originalLength + 6);
    });

    // Content Reference Paths
    it('should find a child of a content reference element by path', () => {
      const originalLength = valueSet.elements.length;
      // Modify system on the current ValueSet to test that we are copying from original SD
      // not the profiled SD
      const include = valueSet.elements.find(e => e.id === 'ValueSet.compose.include');
      const includeSystem = valueSet.elements.find(e => e.id === 'ValueSet.compose.include.system');
      includeSystem.short = 'This should not get copied over!';
      const exclude = valueSet.elements.find(e => e.id === 'ValueSet.compose.exclude');
      const excludeSystem = valueSet.findElementByPath('compose.exclude.system', fisher);
      expect(excludeSystem).toBeDefined();
      expect(excludeSystem.id).toBe('ValueSet.compose.exclude.system');
      expect(excludeSystem.short).toBe('The system the codes come from');
      expect(exclude.contentReference).toBeUndefined();
      expect(exclude.type).toEqual(include.type);
      expect(valueSet.elements.length).toBe(originalLength + 26);
    });

    it('should find a child of a content reference element by path for logical models', () => {
      // This test simply establishes that we can access nested contentreference elements in logicals
      // See: https://github.com/FHIR/sushi/issues/1328
      const viewDefiniton = fisher.fishForStructureDefinition('ViewDefinition', Type.Logical);
      const originalLength = viewDefiniton.elements.length;
      const select = viewDefiniton.elements.find(e => e.id === 'ViewDefinition.select');
      expect(select).toBeDefined();
      const selectName = viewDefiniton.elements.find(e => e.id === 'ViewDefinition.select.name');
      expect(selectName).toBeDefined();
      const selectForEachSelect = viewDefiniton.elements.find(
        e => e.id === 'ViewDefinition.select.forEach.select'
      );
      expect(selectForEachSelect).toBeDefined();
      // At first, we expect this to be a contentReference with no types
      expect(selectForEachSelect.contentReference).toBeDefined();
      expect(selectForEachSelect.type).toBeUndefined();
      // Now use findByElement, which should unfold select.forEach.select using the referenced element (select)
      const selectForEachSelectName = viewDefiniton.findElementByPath(
        'select.forEach.select.name',
        fisher
      );
      // Ensure we got that nested name and that it contains some of the info from the original select metadata
      expect(selectForEachSelectName).toBeDefined();
      expect(selectForEachSelectName.id).toBe('ViewDefinition.select.forEach.select.name');
      expect(selectForEachSelectName.short).toBe('Name of field produced in the output.');
      // And now since we unfolded select.forEach.select, it should take on the physical form of select
      expect(selectForEachSelect.contentReference).toBeUndefined();
      expect(selectForEachSelect.type).toEqual(select.type);
      // Finally check that the process of unfolding added in all the elements from the references select element.
      expect(viewDefiniton.elements.length).toBe(originalLength + 11);
    });

    it('should find a child of a content reference element by path when the reference uses a full URI', () => {
      const originalLength = valueSet.elements.length;
      // Modify system on the current ValueSet to test that we are copying from original SD
      // not the profiled SD
      const include = valueSet.elements.find(e => e.id === 'ValueSet.compose.include');
      const includeSystem = valueSet.elements.find(e => e.id === 'ValueSet.compose.include.system');
      includeSystem.short = 'This should not get copied over!';
      const exclude = valueSet.elements.find(e => e.id === 'ValueSet.compose.exclude');

      // Set the content reference to be a complete path
      exclude.contentReference =
        'http://hl7.org/fhir/StructureDefinition/ValueSet#ValueSet.compose.include';
      const excludeSystem = valueSet.findElementByPath('compose.exclude.system', fisher);
      expect(excludeSystem).toBeDefined();
      expect(excludeSystem.id).toBe('ValueSet.compose.exclude.system');
      expect(excludeSystem.short).toBe('The system the codes come from');
      expect(exclude.contentReference).toBeUndefined();
      expect(exclude.type).toEqual(include.type);
      expect(valueSet.elements.length).toBe(originalLength + 26);
    });

    it('should find a child of a slice content reference by path', () => {
      const originalLength = valueSet.elements.length;
      const include = valueSet.elements.find(e => e.id === 'ValueSet.compose.include');
      const exclude = valueSet.elements.find(e => e.id === 'ValueSet.compose.exclude');
      exclude.slicing = { rules: 'open' };
      const mySlice = exclude.addSlice('mySlice');
      const mySliceSystem = valueSet.findElementByPath('compose.exclude[mySlice].system', fisher);
      expect(mySliceSystem).toBeDefined();
      expect(mySliceSystem.id).toBe('ValueSet.compose.exclude:mySlice.system');
      expect(mySliceSystem.short).toBe('The system the codes come from');
      expect(mySlice.contentReference).toBeUndefined();
      expect(mySlice.type).toEqual(include.type);
      expect(valueSet.elements.length).toBe(originalLength + 27);
    });

    it('should find but not unfold a content reference element by path', () => {
      const originalLength = valueSet.elements.length;
      const exclude = valueSet.findElementByPath('compose.exclude', fisher);
      expect(exclude).toBeDefined();
      expect(exclude.id).toBe('ValueSet.compose.exclude');
      expect(exclude.contentReference).toBe('#ValueSet.compose.include');
      expect(valueSet.elements.length).toBe(originalLength);
    });
  });

  describe('#setInstancePropertyByPath', () => {
    let fooCode: FshCode;
    let barCode: FshCode;
    beforeEach(() => {
      fooCode = new FshCode('foo', 'http://example.com');
      barCode = new FshCode('bar', 'http://example.com');
    });

    // Simple values
    it('should set an instance property which has a value', () => {
      observation.setInstancePropertyByPath('version', '1.2.3', fisher);
      expect(observation.version).toBe('1.2.3');
    });

    it('should set an instance property which must be created', () => {
      observation.setInstancePropertyByPath('title', 'foo', fisher);
      expect(observation.title).toBe('foo');
    });

    it('should not set an instance property which is being assigned incorrectly', () => {
      expect(() => {
        observation.setInstancePropertyByPath('version', 1.2, fisher);
      }).toThrow('Cannot assign number value: 1.2. Value does not match element type: string');
      expect(observation.version).toBe('4.0.1');
    });

    // Simple values in an array
    it('should add an instance property at the end of an array', () => {
      observation.setInstancePropertyByPath('contact[2].telecom[0].value', 'foo', fisher);
      expect(observation.contact.length).toBe(3);
      expect(observation.contact[2]).toEqual({ telecom: [{ value: 'foo' }] });
    });

    it('should add an instance property in an array that must be empty filled', () => {
      observation.setInstancePropertyByPath('contact[4].telecom[0].value', 'foo', fisher);
      expect(observation.contact.length).toBe(5);
      expect(observation.contact[4]).toEqual({ telecom: [{ value: 'foo' }] });
      expect(observation.contact[3]).toBeNull();
      expect(observation.contact[2]).toBeNull();
    });

    it('should add an instance property in an array that has been empty filled', () => {
      observation.setInstancePropertyByPath('contact[3].telecom[0].value', 'foo', fisher);
      observation.setInstancePropertyByPath('contact[2].telecom[0].value', 'bar', fisher);
      expect(observation.contact.length).toBe(4);
      expect(observation.contact[3]).toEqual({ telecom: [{ value: 'foo' }] });
      expect(observation.contact[2]).toEqual({ telecom: [{ value: 'bar' }] });
    });

    it('should change an instance property in an array', () => {
      observation.setInstancePropertyByPath('contact[1].telecom[0].value', 'foo', fisher);
      expect(observation.contact.length).toBe(2);
      expect(observation.contact[1]).toEqual({ telecom: [{ value: 'foo', system: 'url' }] });
    });

    it('should change a part of an instance property in an array', () => {
      observation.setInstancePropertyByPath(
        'contact[0].telecom[0].period.start',
        '2019-11-25',
        fisher
      );
      expect(observation.contact.length).toBe(2);
      expect(observation.contact[0]).toEqual({
        telecom: [{ value: 'http://hl7.org/fhir', system: 'url', period: { start: '2019-11-25' } }]
      });
    });

    // Complex values
    it('should set a complex instance property on a newly created array', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, fisher);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property on a newly created array, with implied 0 index', () => {
      observation.setInstancePropertyByPath('jurisdiction', fooCode, fisher);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property over a value that already exists', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, fisher);
      observation.setInstancePropertyByPath('jurisdiction[0]', barCode, fisher);
      expect(observation.jurisdiction.length).toBe(1);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'bar', system: 'http://example.com' }]
      });
    });

    it('should set a complex instance property on an existing array', () => {
      observation.setInstancePropertyByPath('jurisdiction[0]', fooCode, fisher);
      observation.setInstancePropertyByPath('jurisdiction[1]', barCode, fisher);
      expect(observation.jurisdiction.length).toBe(2);
      expect(observation.jurisdiction[0]).toEqual({
        coding: [{ code: 'foo', system: 'http://example.com' }]
      });
      expect(observation.jurisdiction[1]).toEqual({
        coding: [{ code: 'bar', system: 'http://example.com' }]
      });
    });

    // Children of primitives
    it('should set a child of a primitive instance property which has a value', () => {
      observation.setInstancePropertyByPath('version', 'foo', fisher);
      observation.setInstancePropertyByPath('version.id', 'bar', fisher);
      expect(observation.version).toBe('foo');
      // @ts-ignore
      expect(observation._version.id).toBe('bar');
    });

    it('should set a child of a primitive instance property array which has a value', () => {
      observation.setInstancePropertyByPath('contextInvariant[0]', 'foo', fisher);
      observation.setInstancePropertyByPath('contextInvariant[0].id', 'bar', fisher);
      expect(observation.contextInvariant.length).toBe(1);
      expect(observation.contextInvariant[0]).toBe('foo');
      // @ts-ignore
      expect(observation._contextInvariant[0].id).toBe('bar');
    });

    it('should set a child of a primitive instance property array and null fill the array', () => {
      observation.setInstancePropertyByPath('contextInvariant[1]', 'foo', fisher);
      observation.setInstancePropertyByPath('contextInvariant[1].id', 'bar', fisher);
      expect(observation.contextInvariant.length).toBe(2);
      expect(observation.contextInvariant[0]).toBeNull();
      expect(observation.contextInvariant[1]).toBe('foo');
      // @ts-ignore
      expect(observation._contextInvariant[0]).toBeNull();
      // @ts-ignore
      expect(observation._contextInvariant[1].id).toBe('bar');
    });

    // Invalid access
    it('should throw an InvalidElementAccessError when trying to access the snapshot', () => {
      expect(() => {
        observation.setInstancePropertyByPath('snapshot.element[0]', 'foo', fisher);
      }).toThrow('Cannot directly access differential or snapshot with path: snapshot.element[0]');
    });

    it('should throw an InvalidElementAccessError when trying to access the differential', () => {
      expect(() => {
        observation.setInstancePropertyByPath('differential.element[0]', 'foo', fisher);
      }).toThrow(
        'Cannot directly access differential or snapshot with path: differential.element[0]'
      );
    });

    it('should throw an InvalidTypeAccessError when trying to override the Parent type with a caret value', () => {
      expect(() => {
        observation.setInstancePropertyByPath('type', 'foo', fisher);
      }).toThrow(
        'Cannot directly change type. StructureDefinitions will naturally inherit their Parent type.'
      );
    });
  });

  describe('#validateValueAtPath', () => {
    let structureDefinition: StructureDefinition;
    let respRate: StructureDefinition;
    let CSSPC: StructureDefinition;
    let bundle: StructureDefinition;
    beforeEach(() => {
      structureDefinition = fisher.fishForStructureDefinition('StructureDefinition');
      respRate = fisher.fishForStructureDefinition('resprate');
      bundle = fisher.fishForStructureDefinition('Bundle');
      CSSPC = fisher.fishForStructureDefinition('capabilitystatement-search-parameter-combination');
    });

    // Simple value
    it('should allow assigning an instance value', () => {
      const { assignedValue, pathParts } = structureDefinition.validateValueAtPath(
        'version',
        '4.0.2',
        fisher
      );
      expect(assignedValue).toBe('4.0.2');
      expect(pathParts.length).toBe(1);
      expect(pathParts[0]).toEqual({ primitive: true, base: 'version' });
    });

    it('should allow assigning the same instance value over an existing pattern[x]', () => {
      const method = respRate.findElement('Observation.method');
      method.patternCodeableConcept = { coding: [{ system: 'http://system.com', code: 'foo' }] };
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'method',
        new FshCode('foo', 'http://system.com'),
        fisher
      );
      expect(assignedValue).toEqual({ coding: [{ system: 'http://system.com', code: 'foo' }] });
      expect(pathParts.length).toBe(1);
      expect(pathParts[0]).toEqual({ base: 'method' });
    });

    it('should allow assigning the same instance value over an existing fixed[x]', () => {
      const method = respRate.findElement('Observation.method');
      method.fixedCodeableConcept = { coding: [{ system: 'http://system.com', code: 'foo' }] };
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'method',
        new FshCode('foo', 'http://system.com'),
        fisher
      );
      expect(assignedValue).toEqual({ coding: [{ system: 'http://system.com', code: 'foo' }] });
      expect(pathParts.length).toBe(1);
      expect(pathParts[0]).toEqual({ base: 'method' });
    });

    // Invalid paths
    it('should not allow assigning an instance value with an incorrect path', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('Version', '4.0.2', fisher);
      }).toThrow('The element or path you referenced does not exist: Version');
    });

    it('should not allow assigning an instance value with an incorrect value', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version', true, fisher);
      }).toThrow('Cannot assign boolean value: true. Value does not match element type: string');
    });

    it('should not allow assigning an instance value with a 0 cardinality', () => {
      const version = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.version'
      );
      version.max = '0';
      expect(() => {
        structureDefinition.validateValueAtPath('version', '4.0.2', fisher);
      }).toThrow('The element or path you referenced does not exist: version');
    });

    // Arrays
    it('should allow assigning an instance value to an element in an array', () => {
      const { assignedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier[0].value',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow assigning an instance value to an element in an array, with implied 0 index', () => {
      const { assignedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier.value',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow assigning an instance value to an element in an array if the element was constrained from an array', () => {
      // code.coding[RespRateCode] has been constrained from 1..* to 1..1
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'code.coding[RespRateCode].id',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({ base: 'code' });
      expect(pathParts[1]).toEqual({
        base: 'coding',
        brackets: ['RespRateCode', '0'],
        slices: ['RespRateCode']
      }); // 0 in path parts means value will be set in an array
      expect(pathParts[2]).toEqual({ primitive: true, base: 'id' });
    });

    it('should not allow using array brackets when an element is not an array', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version[0]', 'foo', fisher);
      }).toThrow('The element or path you referenced does not exist: version[0]');
    });

    it('should not add an instance property in an array with negative index', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('contact[-1].telecom[0].value', 'foo', fisher);
      }).toThrow('The element or path you referenced does not exist: contact[-1].telecom[0].value');
    });

    it('should not add an instance property in an array with too large an index', () => {
      const contact = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.contact'
      );
      contact.max = '3';
      expect(() => {
        structureDefinition.validateValueAtPath('contact[4].telecom[0].value', 'foo', fisher);
      }).toThrow('The element or path you referenced does not exist: contact[4].telecom[0].value');
    });

    // Slices
    it('should allow assigning an instance value on a slice', () => {
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'category[VSCat].coding[0].version',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({
        base: 'category',
        brackets: ['VSCat', '0'],
        slices: ['VSCat']
      });
      expect(pathParts[1]).toEqual({
        base: 'coding',
        brackets: ['0'],
        slices: ['VSCat']
      });
      expect(pathParts[2]).toEqual({ primitive: true, base: 'version' });
    });

    it('should allow assigning an instance value on a slice array', () => {
      const { assignedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[required][3].value[x]',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'extension',
        brackets: ['required', '3'],
        slices: ['required']
      });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value[x]' });
    });

    it('should allow setting values directly on extensions by accessing indexes', () => {
      // This test also tests that we can access later indexes of an array that has been unfolded at other indexes
      // For example, extension[0].url has already been unfolded an has values assigned.
      // validateValueAtPath correctly validates values for extension[2]
      const { assignedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[2].url',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'extension', brackets: ['2'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'url' });
    });

    it('should allow setting arbitrary defined extensions', () => {
      const originalLength = respRate.elements.length;
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'extension[patient-mothersMaidenName].value[x]',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'extension',
        brackets: ['patient-mothersMaidenName', '0'],
        slices: ['patient-mothersMaidenName']
      });
      expect(respRate.elements.length).toBe(originalLength + 5);
    });

    it('should allow setting abritrary defined extensions by url', () => {
      const originalLength = respRate.elements.length;
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'extension[http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName].value[x]',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'extension',
        brackets: ['patient-mothersMaidenName', '0'],
        slices: ['patient-mothersMaidenName']
      });
      expect(respRate.elements.length).toBe(originalLength + 5);
    });

    it('should allow setting nested arbitrary defined extensions', () => {
      const originalLength = respRate.elements.length;
      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'extension[0].extension[patient-mothersMaidenName].value[x]',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[1]).toEqual({
        base: 'extension',
        brackets: ['patient-mothersMaidenName', '0'],
        slices: ['patient-mothersMaidenName']
      });
      expect(respRate.elements.length).toBe(originalLength + 9);
    });

    it('should not allow setting arbitrary undefined extensions', () => {
      expect(() => {
        respRate.validateValueAtPath('extension[fake-extension].value[x]', 'foo', fisher);
      }).toThrow(
        'The element or path you referenced does not exist: extension[fake-extension].value[x]'
      );
    });

    it('should rename extensions when they are referred to by name instead of sliceName', () => {
      const originalLength = respRate.elements.length;
      const extension = respRate.findElementByPath('extension', fisher);
      extension.sliceIt('type', '$this', false, 'open');
      const slice = extension.addSlice('maiden-name');
      slice.type[0].profile = ['http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'];

      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'extension[patient-mothersMaidenName].valueString',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'extension',
        brackets: ['maiden-name', '0'],
        slices: ['maiden-name']
      });
      expect(respRate.elements.length).toBe(originalLength + 5);
    });

    it('should rename modifierExtensions when they are referred to by name instead of sliceName', () => {
      const originalLength = respRate.elements.length;
      const modExtension = respRate.findElementByPath('modifierExtension', fisher);
      modExtension.sliceIt('type', '$this', false, 'open');
      const slice = modExtension.addSlice('maiden-name');
      slice.type[0].profile = ['http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName'];

      const { assignedValue, pathParts } = respRate.validateValueAtPath(
        'modifierExtension[patient-mothersMaidenName].valueString',
        'foo',
        fisher
      );
      expect(assignedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'modifierExtension',
        brackets: ['maiden-name', '0'],
        slices: ['maiden-name']
      });
      expect(respRate.elements.length).toBe(originalLength + 5);
    });

    describe('#Inline Instances', () => {
      beforeEach(() => {
        const contained = respRate.findElementByPath('contained', fisher);
        contained.sliceIt('type', '$this', false, 'open');
        contained.addSlice('PatientsOnly');
        const containedPatients = respRate.findElementByPath('contained[PatientsOnly]', fisher);
        const patientRule = new OnlyRule('contained[PatientsOnly]');
        patientRule.types = [{ type: 'Patient' }];
        containedPatients.constrainType(patientRule, fisher);

        contained.addSlice('DomainsOnly');
        const containedDomains = respRate.findElementByPath('contained[DomainsOnly]', fisher);
        const domainRule = new OnlyRule('contained[DomainsOnly]');
        domainRule.types = [{ type: 'DomainResource' }];
        containedDomains.constrainType(domainRule, fisher);

        contained.addSlice('PatientOrObservation');
        const containedChoice = respRate.findElementByPath(
          'contained[PatientOrObservation]',
          fisher
        );
        const choiceRule = new OnlyRule('contained[PatientOrObservation]');
        choiceRule.types = [{ type: 'Patient' }, { type: 'Observation' }];
        containedChoice.constrainType(choiceRule, fisher);
      });

      it('should allow assigning a Patient type InstanceDefinition to a Resource element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.resourceType = 'Patient';
        const { assignedValue } = respRate.validateValueAtPath('contained[0]', instanceDef, fisher);
        expect(assignedValue.resourceType).toBe('Patient');
      });

      it('should allow assigning a Patient type InstanceDefinition to a DomainResource element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.resourceType = 'Patient';
        const { assignedValue } = respRate.validateValueAtPath(
          'contained[DomainsOnly][0]',
          instanceDef,
          fisher
        );
        expect(assignedValue.resourceType).toBe('Patient');
      });

      it('should allow assigning a Patient type InstanceDefinition to a Patient element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.resourceType = 'Patient';
        const { assignedValue } = respRate.validateValueAtPath(
          'contained[PatientsOnly][0]',
          instanceDef,
          fisher
        );
        expect(assignedValue.resourceType).toBe('Patient');
      });

      it('should allow assigning a Patient type InstanceDefinition to a choice element that includes Patient', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.resourceType = 'Patient';
        const { assignedValue } = respRate.validateValueAtPath(
          'contained[PatientOrObservation][0]',
          instanceDef,
          fisher
        );
        expect(assignedValue.resourceType).toBe('Patient');
      });

      it('should allow assigning a Bundle type InstanceDefinition to a Resource element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.id = 'OfJoy';
        instanceDef.resourceType = 'Bundle';
        const { assignedValue } = respRate.validateValueAtPath('contained[0]', instanceDef, fisher);
        expect(assignedValue.resourceType).toBe('Bundle');
      });

      it('should not allow assigning a Bundle type InstanceDefinition to a DomainResource element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.id = 'OfJoy';
        instanceDef.resourceType = 'Bundle';
        expect(() =>
          respRate.validateValueAtPath('contained[DomainsOnly][0]', instanceDef, fisher)
        ).toThrow(/Bundle.*OfJoy.*DomainResource/);
      });

      it('should not allow assigning a Bundle type InstanceDefinition to a Patient element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.id = 'OfJoy';
        instanceDef.resourceType = 'Bundle';
        expect(() =>
          respRate.validateValueAtPath('contained[PatientsOnly][0]', instanceDef, fisher)
        ).toThrow(/Bundle.*OfJoy.*Patient/);
      });

      it('should not allow assigning a Bundle type InstanceDefinition to a choice element that does not include Bundle', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.id = 'OfJoy';
        instanceDef.resourceType = 'Bundle';
        expect(() =>
          respRate.validateValueAtPath('contained[PatientOrObservation][0]', instanceDef, fisher)
        ).toThrow(/Bundle.*OfJoy.*Patient, Observation/);
      });

      it('should allow assigning a CodeableConcept type InstanceDefinition to a CodeableConcept element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.coding = [{ value: '#5' }];
        instanceDef._instanceMeta.sdType = 'CodeableConcept';
        const { assignedValue } = respRate.validateValueAtPath('code', instanceDef, fisher);
        expect(assignedValue).toEqual({ coding: [{ value: '#5' }] });
      });

      it('should allow assigning a specialization of a type to a type', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.value = 5;
        instanceDef._instanceMeta.sdType = 'Age';
        const { assignedValue } = respRate.validateValueAtPath(
          'valueQuantity',
          instanceDef,
          fisher
        );
        expect(assignedValue).toEqual({ value: 5 });
      });

      it('should allow assigning a profile of a type to a type', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.value = 5;
        instanceDef._instanceMeta.sdType = 'SimpleQuantity';
        const { assignedValue } = respRate.validateValueAtPath(
          'valueQuantity',
          instanceDef,
          fisher
        );
        expect(assignedValue).toEqual({ value: 5 });
      });

      it('should allow assigning a type to a choice type element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.value = 5;
        instanceDef._instanceMeta.sdType = 'Quantity';
        const { assignedValue } = observation.validateValueAtPath('value[x]', instanceDef, fisher);
        expect(assignedValue).toEqual({ value: 5 });
      });

      it('should not allow assigning a type that is not in the choice to a choice type element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.value = 5.0;
        instanceDef._instanceMeta.sdType = 'Money';
        instanceDef.id = 'Cash';
        expect(() => observation.validateValueAtPath('value[x]', instanceDef, fisher)).toThrow(
          'Cannot assign Money value: Cash. Value does not match element type: '
        );
      });

      it('should not allow assigning a type to a non-matching type', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.value = 5;
        instanceDef._instanceMeta.sdType = 'Quantity';
        instanceDef.id = 'Foo';
        expect(() => respRate.validateValueAtPath('code', instanceDef, fisher)).toThrow(
          'Cannot assign Quantity value: Foo. Value does not match element type: CodeableConcept'
        );
      });

      it('should not allow assigning a parent of a type to a type', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef._instanceMeta.sdType = 'Element';
        instanceDef.id = 'Foo';
        expect(() => respRate.validateValueAtPath('code', instanceDef, fisher)).toThrow(
          'Cannot assign Element value: Foo. Value does not match element type: CodeableConcept'
        );
      });

      it('should allow assigning an extension of to an extension element', () => {
        const instanceDef = new InstanceDefinition();
        instanceDef.valueString = 'hello';
        instanceDef._instanceMeta.sdType = 'Extension';
        const { assignedValue } = respRate.validateValueAtPath('extension', instanceDef, fisher);
        expect(assignedValue).toEqual({ valueString: 'hello' });
      });

      // Overriding elements
      it('should allow replacing parts of a Resource element', () => {
        const language = new FshCode('French');
        const { assignedValue } = respRate.validateValueAtPath(
          'contained[0].language',
          language,
          fisher
        );
        expect(assignedValue).toBe('French');
      });

      it('should allow replacing parts of a Patient element', () => {
        const gender = new FshCode('F');
        const { assignedValue } = respRate.validateValueAtPath(
          'contained[PatientsOnly][0].gender',
          gender,
          fisher
        );
        expect(assignedValue).toBe('F');
      });

      it('should allow overriding a Resource with a Patient', () => {
        const gender = new FshCode('F');
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[0].gender',
          gender,
          fisher,
          ['Patient']
        );
        expect(assignedValue).toBe('F');
        expect(pathParts).toEqual([
          { base: 'contained', brackets: ['0'] },
          { base: 'gender', primitive: true }
        ]);
      });

      it('should allow overriding a Resource with a Patient within a Resource overriden by a Bundle', () => {
        const gender = new FshCode('F');
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[0].entry[0].resource.gender',
          gender,
          fisher,
          ['Bundle', null, 'Patient', null]
        );
        expect(assignedValue).toBe('F');
        expect(pathParts).toEqual([
          { base: 'contained', brackets: ['0'] },
          { base: 'entry', brackets: ['0'] },
          { base: 'resource' },
          { base: 'gender', primitive: true }
        ]);
      });

      it('should allow overriding a Resource with a Patient within a Resource overriden by a Bundle within a Bundle', () => {
        const gender = new FshCode('F');
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[0].entry[0].resource.entry[0].resource.gender',
          gender,
          fisher,
          ['Bundle', null, 'Bundle', null, 'Patient', null]
        );
        expect(assignedValue).toBe('F');
        expect(pathParts).toEqual([
          { base: 'contained', brackets: ['0'] },
          { base: 'entry', brackets: ['0'] },
          { base: 'resource' },
          { base: 'entry', brackets: ['0'] },
          { base: 'resource' },
          { base: 'gender', primitive: true }
        ]);
      });

      it('should allow overriding a Resource with a Profile', () => {
        const unit = 'slugs';
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[0].valueQuantity.unit',
          unit,
          fisher,
          ['http://hl7.org/fhir/StructureDefinition/resprate', null, null]
        );
        expect(assignedValue).toBe('slugs');
        expect(pathParts).toEqual([
          { base: 'contained', brackets: ['0'] },
          { base: 'valueQuantity' },
          { base: 'unit', primitive: true }
        ]);
      });

      it('should not allow overriding a Resource constrained to Patient with a non-Patient path', () => {
        const system = 'http://hello.com';
        expect(() =>
          respRate.validateValueAtPath('contained[0].system', system, fisher, ['Patient'])
        ).toThrow('The element or path you referenced does not exist: contained[0].system');
      });

      it('should not allow overriding a Resource constrained to Patient with a non-Patient path inside a Resource', () => {
        const system = 'http://hello.com';
        expect(() =>
          respRate.validateValueAtPath('contained[0].entry[0].resource.system', system, fisher, [
            'Bundle',
            null,
            'Patient',
            null
          ])
        ).toThrow(
          'The element or path you referenced does not exist: contained[0].entry[0].resource.system'
        );
      });

      it('should not allow overriding a Patient with an Observation', () => {
        const method = new FshCode('man', 'http://method.com');
        expect(() =>
          respRate.validateValueAtPath('contained[PatientsOnly].method', method, fisher, [
            'Observation'
          ])
        ).toThrow(
          'The element or path you referenced does not exist: contained[PatientsOnly].method'
        );
      });

      it('should not allow overriding a Resource constrained to a non-FHIR Resource', () => {
        const system = 'http://hello.com';
        expect(() =>
          respRate.validateValueAtPath('contained[0].system', system, fisher, ['CodeableConcept'])
        ).toThrow('The element or path you referenced does not exist: contained[0].system');
      });

      // resourceType
      it('should allow a valid FHIR resourceType to be set on a Resource element', () => {
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[0].resourceType',
          'Patient',
          fisher
        );
        expect(assignedValue).toBe('Patient');
        expect(pathParts).toEqual([
          { base: 'contained', brackets: ['0'] },
          { base: 'resourceType' }
        ]);
      });

      it('should allow a valid FHIR resourceType to be set on a DomainResource element', () => {
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[DomainsOnly][0].resourceType',
          'Patient',
          fisher
        );
        expect(assignedValue).toBe('Patient');
        expect(pathParts).toEqual([
          {
            base: 'contained',
            brackets: ['DomainsOnly', '0'],
            slices: ['DomainsOnly']
          },
          { base: 'resourceType' }
        ]);
      });

      it('should allow a valid FHIR resourceType to be set on a Patient element', () => {
        const { assignedValue, pathParts } = respRate.validateValueAtPath(
          'contained[PatientsOnly][0].resourceType',
          'Patient',
          fisher
        );
        expect(assignedValue).toBe('Patient');
        expect(pathParts).toEqual([
          {
            base: 'contained',
            brackets: ['PatientsOnly', '0'],
            slices: ['PatientsOnly']
          },
          { base: 'resourceType' }
        ]);
      });

      it('should not allow a resourceType to be set on a non-Resource element', () => {
        expect(() => {
          respRate.validateValueAtPath('code.resourceType', 'CodeableConcept', fisher);
        }).toThrow(
          'A resourceType of CodeableConcept cannot be set on an element of type CodeableConcept.'
        );
      });

      it('should not allow an invalid FHIR resourceType to be set on a DomainResource element', () => {
        expect(() =>
          respRate.validateValueAtPath('contained[DomainsOnly][0].resourceType', 'Bundle', fisher)
        ).toThrow('A resourceType of Bundle cannot be set on an element of type DomainResource.');
      });

      it('should not allow an invalid FHIR resourceType to be set on a Patient element', () => {
        expect(() =>
          respRate.validateValueAtPath(
            'contained[PatientsOnly][0].resourceType',
            'Resource',
            fisher
          )
        ).toThrow('A resourceType of Resource cannot be set on an element of type Patient.');
      });

      it('should not allow a profile resourceType to be set on a Resource element', () => {
        expect(() =>
          respRate.validateValueAtPath('contained[0].resourceType', 'resprate', fisher)
        ).toThrow('A resourceType of resprate cannot be set on an element of type Resource');
      });

      it('should not allow an invalid FHIR resourceType to be set on a choice element', () => {
        expect(() =>
          respRate.validateValueAtPath('component.value[x].resourceType', 'Patient', fisher)
        ).toThrow(
          'The element or path you referenced does not exist: component.value[x].resourceType'
        );
      });

      it('should not allow a resourceType to be set at the top level of the instance', () => {
        expect(() => respRate.validateValueAtPath('resourceType', 'Patient', fisher)).toThrow(
          'The element or path you referenced does not exist: resourceType'
        );
      });

      // https://github.com/FHIR/sushi/issues/1020
      it('should throw when attempting to access extension on a bundle', () => {
        expect(() => bundle.validateValueAtPath('extension.url', 'test', fisher)).toThrow(
          'The element or path you referenced does not exist: extension.url'
        );
      });
    });
  });

  describe('#captureOriginalElements()', () => {
    it('should create a new starting point for diffs', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      observation.captureOriginalElements();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.min = 1;
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#clearOriginalElements()', () => {
    it('should remove the starting point for diffs, making everything diff', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      observation.captureOriginalElements();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.clearOriginal();
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#getReferenceOrCanonicalName', () => {
    let basedOn: ElementDefinition;
    let actDef: ElementDefinition;
    beforeEach(() => {
      basedOn = observation.findElement('Observation.basedOn');
      actDef = planDefinition.findElement('PlanDefinition.action.definition[x]');
    });

    it('should find the reference target when it exists', () => {
      const refTarget = observation.getReferenceOrCanonicalName(
        'basedOn[MedicationRequest]',
        basedOn
      );
      expect(refTarget).toBe('MedicationRequest');
    });

    it('should not find the reference target when it does not exist', () => {
      const refTarget = observation.getReferenceOrCanonicalName('basedOn[foo]', basedOn);
      expect(refTarget).toBeUndefined();
    });

    it('should not find the reference target when there are no brackets', () => {
      const refTarget = observation.getReferenceOrCanonicalName('basedOn', basedOn);
      expect(refTarget).toBeUndefined();
    });

    it('should find the canonical target when it exists', () => {
      const canTarget = planDefinition.getReferenceOrCanonicalName(
        'action.definition[x][ActivityDefinition]',
        actDef
      );
      expect(canTarget).toBe('ActivityDefinition');
    });

    it('should not find the reference target when it does not exist', () => {
      const canTarget = planDefinition.getReferenceOrCanonicalName(
        'action.definition[x][foo]',
        actDef
      );
      expect(canTarget).toBeUndefined();
    });

    it('should not find the reference target when there are no brackets', () => {
      const canTarget = planDefinition.getReferenceOrCanonicalName('action.definition[x]', actDef);
      expect(canTarget).toBeUndefined();
    });
  });

  describe('#valid', () => {
    it('should log an error when at least one element is invalid', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      const errorSpy = jest
        .spyOn(valueX, 'validate')
        .mockReturnValue([new ValidationError('issue', 'path')]);

      const validationErrors = observation.validate();
      expect(validationErrors).toHaveLength(1);
      expect(validationErrors[0].message).toMatch(/Observation\.value\[x\] \^path: issue/);
      errorSpy.mockRestore();
    });
  });
});
