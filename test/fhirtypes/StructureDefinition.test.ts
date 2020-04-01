import fs from 'fs-extra';
import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinition, ElementDefinitionType } from '../../src/fhirtypes/ElementDefinition';
import { TestFisher } from '../testhelpers';
import { FshCode } from '../../src/fshtypes';
import { Type } from '../../src/utils/Fishable';
import { OnlyRule } from '../../src/fshtypes/rules';
import { InstanceDefinition } from '../../src/fhirtypes';

describe('StructureDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  let resprate: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
    // resolve observation once to ensure it is present in defs
    observation = fisher.fishForStructureDefinition('Observation');

    jsonObservation = defs.fishForFHIR('Observation', Type.Resource);
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
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
        /http:\/\/hl7.org\/fhir\/StructureDefinition\/Observation is missing snapshot/
      );
    });
  });

  describe('#toJSON', () => {
    // Skipping because the differential doesn't come back right.
    // Need to re-evaluate how we do differentials.
    it.skip('should round trip back to the original JSON', () => {
      const newJSON = observation.toJSON();
      expect(newJSON).toEqual(jsonObservation);
    });

    it('should reflect differentials for elements that changed after capturing originals', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.short = 'Special observation code';
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.min = 1;

      const json = observation.toJSON();
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
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.short = 'Special observation code';
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.min = 1;

      const json = observation.toJSON(false);
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

    it('should reflect basic differential for structure definitions with no changes', () => {
      const json = observation.toJSON();
      expect(json.differential).toEqual({ element: [{ id: 'Observation', path: 'Observation' }] });
    });

    it('should reflect basic differential for structure definitions with no changes without generating snapshot', () => {
      const json = observation.toJSON(false);
      expect(json.differential).toEqual({ element: [{ id: 'Observation', path: 'Observation' }] });
      expect(json.snapshot).toBeUndefined();
    });

    it('should properly serialize snapshot and differential for constrained choice type with constraints on specific choices', () => {
      // constrain value[x] to only a Quantity or string and give each its own short
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.sliceIt('type', '$this', false, 'open');
      const valueConstraint = new OnlyRule('value[x]');
      valueConstraint.types = [{ type: 'Quantity' }, { type: 'string' }];
      valueX.constrainType(valueConstraint, fisher);
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = observation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element[21];
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toEqual([{ code: 'Quantity' }, { code: 'string' }]);
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element[22];
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element[23];
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check that differential has value[x] and shortcut syntax valueQuantity and valueString
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
      expect(valueQuantityDiff.id).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBeUndefined();
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[2];
      expect(valueStringDiff.id).toBe('Observation.valueString');
      expect(valueStringDiff.path).toBe('Observation.valueString');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBeUndefined();
      expect(valueStringSnapshot.short).toBe('the string choice');
    });

    it('should properly serialize snapshot and differential for unconstrained choice type with constraints on specific choices', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.sliceIt('type', '$this', false, 'open');
      // note: NOT constraining value[x] types.  Just adding specific elements for valueQuantity and valueString.
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = observation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element[21];
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toHaveLength(11);
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element[22];
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element[23];
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check that differential does NOT have value[x] but has shortcut syntax for valueQuantity and valueString
      expect(json.differential.element).toHaveLength(2);
      const valueQuantityDiff = json.differential.element[0];
      expect(valueQuantityDiff.id).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBeUndefined();
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[1];
      expect(valueStringDiff.id).toBe('Observation.valueString');
      expect(valueStringDiff.path).toBe('Observation.valueString');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBeUndefined();
      expect(valueStringSnapshot.short).toBe('the string choice');
    });

    it('should properly serialize snapshot and differential for choice type with non-type constraint and with constraints on specific choices', () => {
      // This is the same test as above, but we add a non-type constraint on value[x] to make sure it doesn't get
      // blindly thrown away just because it doesn't constrain the types
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      valueX.short = 'a choice of many things';
      valueX.sliceIt('type', '$this', false, 'open');
      // note: NOT constraining value[x] types.  Just adding specific elements for valueQuantity and valueString.
      const valueQuantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      valueQuantity.short = 'the quantity choice';
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      valueString.short = 'the string choice';

      const json = observation.toJSON();
      // first check the snapshot value[x], value[x]:valueQuantity, and value[x]:valueString for formal correctness
      const valueXSnapshot = json.snapshot.element[21];
      expect(valueXSnapshot.id).toBe('Observation.value[x]');
      expect(valueXSnapshot.path).toBe('Observation.value[x]');
      expect(valueXSnapshot.type).toHaveLength(11);
      expect(valueXSnapshot.short).toBe('a choice of many things');
      expect(valueXSnapshot.slicing).toEqual({
        discriminator: [{ type: 'type', path: '$this' }],
        ordered: false,
        rules: 'open'
      });
      const valueQuantitySnapshot = json.snapshot.element[22];
      expect(valueQuantitySnapshot.id).toBe('Observation.value[x]:valueQuantity');
      expect(valueQuantitySnapshot.path).toBe('Observation.value[x]');
      expect(valueQuantitySnapshot.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantitySnapshot.sliceName).toEqual('valueQuantity');
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringSnapshot = json.snapshot.element[23];
      expect(valueStringSnapshot.id).toBe('Observation.value[x]:valueString');
      expect(valueStringSnapshot.path).toBe('Observation.value[x]');
      expect(valueStringSnapshot.type).toEqual([{ code: 'string' }]);
      expect(valueStringSnapshot.sliceName).toEqual('valueString');
      expect(valueStringSnapshot.short).toBe('the string choice');
      // then check that differential does NOT have value[x] but has shortcut syntax for valueQuantity and valueString
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
      expect(valueQuantityDiff.id).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.path).toBe('Observation.valueQuantity');
      expect(valueQuantityDiff.type).toEqual([{ code: 'Quantity' }]);
      expect(valueQuantityDiff.sliceName).toBeUndefined();
      expect(valueQuantitySnapshot.short).toBe('the quantity choice');
      const valueStringDiff = json.differential.element[2];
      expect(valueStringDiff.id).toBe('Observation.valueString');
      expect(valueStringDiff.path).toBe('Observation.valueString');
      expect(valueStringDiff.type).toEqual([{ code: 'string' }]);
      expect(valueStringDiff.sliceName).toBeUndefined();
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
        'extension[http://hl7.org/fhir/StructureDefinition/composition-clinicaldocument-versionNumber].valueString',
        fisher
      );
      expect(valueString).toBeDefined();
      expect(valueString.id).toBe('Composition.extension:versionNumber.value[x]:valueString');
      expect(clinicalDocument.elements.length).toBe(originalLength + 5);
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

    it('should not set an instance property which is being fixed incorrectly', () => {
      expect(() => {
        observation.setInstancePropertyByPath('version', 1.2, fisher);
      }).toThrow('Cannot fix number value: 1.2. Value does not match element type: string');
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
  });

  describe('#validateValueAtPath', () => {
    let structureDefinition: StructureDefinition;
    let respRate: StructureDefinition;
    let CSSPC: StructureDefinition;
    beforeEach(() => {
      structureDefinition = fisher.fishForStructureDefinition('StructureDefinition');
      respRate = fisher.fishForStructureDefinition('resprate');
      CSSPC = fisher.fishForStructureDefinition('capabilitystatement-search-parameter-combination');
    });

    // Simple value
    it('should allow fixing an instance value', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath(
        'version',
        '4.0.2',
        fisher
      );
      expect(fixedValue).toBe('4.0.2');
      expect(pathParts.length).toBe(1);
      expect(pathParts[0]).toEqual({ primitive: true, base: 'version' });
    });

    // Invalid paths
    it('should not allow fixing an instance value with an incorrect path', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('Version', '4.0.2', fisher);
      }).toThrow('Cannot resolve element from path: Version');
    });

    it('should not allow fixing an instance value with an incorrect value', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version', true, fisher);
      }).toThrow('Cannot fix boolean value: true. Value does not match element type: string');
    });

    it('should not allow fixing an instance value with a 0 cardinality', () => {
      const version = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.version'
      );
      version.max = '0';
      expect(() => {
        structureDefinition.validateValueAtPath('version', '4.0.2', fisher);
      }).toThrow('Cannot resolve element from path: version');
    });

    // Arrays
    it('should allow fixing an instance value to an element in an array', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier[0].value',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow fixing an instance value to an element in an array, with implied 0 index', () => {
      const { fixedValue, pathParts } = structureDefinition.validateValueAtPath(
        'identifier.value',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'identifier', brackets: ['0'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value' });
    });

    it('should allow fixing an instance value to an element in an array if the element was constrained from an array', () => {
      // code.coding[RespRateCode] has been constrained from 1..* to 1..1
      const { fixedValue, pathParts } = respRate.validateValueAtPath(
        'code.coding[RespRateCode].id',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({ base: 'code' });
      expect(pathParts[1]).toEqual({ base: 'coding', brackets: ['RespRateCode', '0'] }); // 0 in path parts means value will be set in an array
      expect(pathParts[2]).toEqual({ primitive: true, base: 'id' });
    });

    it('should not allow using array brackets when an element is not an array', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('version[0]', 'foo', fisher);
      }).toThrow('Cannot resolve element from path: version[0]');
    });

    it('should not add an instance property in an array with negative index', () => {
      expect(() => {
        structureDefinition.validateValueAtPath('contact[-1].telecom[0].value', 'foo', fisher);
      }).toThrow('Cannot resolve element from path: contact[-1].telecom[0].value');
    });

    it('should not add an instance property in an array with too large an index', () => {
      const contact = structureDefinition.elements.find(
        e => e.id === 'StructureDefinition.contact'
      );
      contact.max = '3';
      expect(() => {
        structureDefinition.validateValueAtPath('contact[4].telecom[0].value', 'foo', fisher);
      }).toThrow('Cannot resolve element from path: contact[4].telecom[0].value');
    });

    // Slices
    it('should allow fixing an instance value on a slice', () => {
      const { fixedValue, pathParts } = respRate.validateValueAtPath(
        'category[VSCat].coding[0].version',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(3);
      expect(pathParts[0]).toEqual({ base: 'category', brackets: ['VSCat', '0'] });
      expect(pathParts[1]).toEqual({ base: 'coding', brackets: ['0'] });
      expect(pathParts[2]).toEqual({ primitive: true, base: 'version' });
    });

    it('should allow fixing an instance value on a slice array', () => {
      const { fixedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[required][3].value[x]',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'extension', brackets: ['required', '3'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'value[x]' });
    });

    it('should allow setting values directly on extensions by accessing indexes', () => {
      // This test also tests that we can access later indexes of an array that has been unfolded at other indexes
      // For example, extension[0].url has already been unfolded an has values fixed.
      // validateValueAtPath correctly validates values for extension[2]
      const { fixedValue, pathParts } = CSSPC.validateValueAtPath(
        'extension[2].url',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({ base: 'extension', brackets: ['2'] });
      expect(pathParts[1]).toEqual({ primitive: true, base: 'url' });
    });

    it('should allow setting arbitrary defined extensions', () => {
      const originalLength = respRate.elements.length;
      const { fixedValue, pathParts } = respRate.validateValueAtPath(
        'extension[patient-mothersMaidenName].value[x]',
        'foo',
        fisher
      );
      expect(fixedValue).toBe('foo');
      expect(pathParts.length).toBe(2);
      expect(pathParts[0]).toEqual({
        base: 'extension',
        brackets: ['patient-mothersMaidenName', '0']
      });
      expect(respRate.elements.length).toBe(originalLength + 5);
    });

    it('should not allow setting arbitrary undefined extensions', () => {
      expect(() => {
        respRate.validateValueAtPath('extension[fake-extension].value[x]', 'foo', fisher);
      }).toThrow('Cannot resolve element from path: extension[fake-extension].value[x]');
    });

    it('should allow fixing an InstanceDefinition to a resource element', () => {
      const instanceDef = new InstanceDefinition();
      instanceDef.resourceType = 'Patient';
      const { fixedValue } = respRate.validateValueAtPath('contained[0]', instanceDef, fisher);
      expect(fixedValue.resourceType).toBe('Patient');
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

  describe('#getReferenceName', () => {
    let basedOn: ElementDefinition;
    beforeEach(() => {
      basedOn = observation.findElement('Observation.basedOn');
    });

    it('should find the target when it exists', () => {
      const refTarget = observation.getReferenceName('basedOn[MedicationRequest]', basedOn);
      expect(refTarget).toBe('MedicationRequest');
    });

    it('should not find the target when it does not exist', () => {
      const refTarget = observation.getReferenceName('basedOn[foo]', basedOn);
      expect(refTarget).toBeUndefined();
    });

    it('should not find the target when there are no brackets', () => {
      const refTarget = observation.getReferenceName('basedOn', basedOn);
      expect(refTarget).toBeUndefined();
    });
  });
});
