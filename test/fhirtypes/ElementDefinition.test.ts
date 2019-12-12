import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ElementDefinition } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { getResolver } from '../testhelpers/getResolver';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonValueX: any;
  let observation: StructureDefinition;
  let valueX: ElementDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonValueX = jsonObservation.snapshot.element[21];
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    valueX = ElementDefinition.fromJSON(jsonValueX);
    valueX.structDef = observation;
  });

  describe('#fromJSON', () => {
    it('should load an element properly', () => {
      // Don't test everything, but get a sample anyway
      expect(valueX.hasDiff()).toBeFalsy();
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        { code: 'Quantity' },
        { code: 'CodeableConcept' },
        { code: 'string' },
        { code: 'boolean' },
        { code: 'integer' },
        { code: 'Range' },
        { code: 'Ratio' },
        { code: 'SampledData' },
        { code: 'time' },
        { code: 'dateTime' },
        { code: 'Period' }
      ]);
    });

    it('should load an element properly without capturing original', () => {
      const valueX = ElementDefinition.fromJSON(jsonValueX, false);
      // Don't test everything, but get a sample anyway
      expect(valueX.hasDiff()).toBeTruthy();
      expect(valueX.calculateDiff()).toEqual(valueX);
      expect(valueX.id).toBe('Observation.value[x]');
      expect(valueX.path).toBe('Observation.value[x]');
      expect(valueX.min).toBe(0);
      expect(valueX.max).toBe('1');
      expect(valueX.type).toEqual([
        { code: 'Quantity' },
        { code: 'CodeableConcept' },
        { code: 'string' },
        { code: 'boolean' },
        { code: 'integer' },
        { code: 'Range' },
        { code: 'Ratio' },
        { code: 'SampledData' },
        { code: 'time' },
        { code: 'dateTime' },
        { code: 'Period' }
      ]);
    });
  });

  describe('#toJSON', () => {
    it('should round trip back to the original JSON', () => {
      const newJSON = valueX.toJSON();
      expect(newJSON).toEqual(jsonValueX);
    });
  });

  describe('#id()', () => {
    it('should reset the path when you change the id', () => {
      expect(valueX.path).toBe('Observation.value[x]');
      valueX.id = 'Observation.valueString';
      expect(valueX.path).toBe('Observation.valueString');
    });
  });

  describe('#getPathWithoutBase()', () => {
    it('should get the path without the base', () => {
      expect(valueX.getPathWithoutBase()).toBe('value[x]');
    });
  });

  describe('#newChildElement', () => {
    it('should create a child element w/ proper id, path, and structdef', () => {
      const child = valueX.newChildElement('sonny');
      expect(child.id).toBe('Observation.value[x].sonny');
      expect(child.path).toBe('Observation.value[x].sonny');
      expect(child.structDef).toBe(observation);
    });
  });

  describe('#captureOriginal()', () => {
    it('should create a new starting point for diffs', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      valueX.min = 1;
      expect(valueX.hasDiff()).toBeTruthy();
      valueX.captureOriginal();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.min = 2;
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#clearOriginal()', () => {
    it('should remove the starting point for diffs, making everything diff', () => {
      // Note: this is not as true a unit test as it should be since it is intertwined
      // with hasDiff(), but there isn't an easy way around this since _original is private.
      valueX.min = 1;
      valueX.captureOriginal();
      expect(valueX.hasDiff()).toBeFalsy();
      valueX.clearOriginal();
      expect(valueX.hasDiff()).toBeTruthy();
    });
  });

  describe('#hasDiff', () => {
    it('should always show a diff for brand new elements w/ no original captured', () => {
      const newElement = new ElementDefinition('newElement');
      expect(newElement.hasDiff()).toBeTruthy();
    });

    it('should not have a diff if nothing changes after capturing original', () => {
      valueX.min = 1;
      valueX.captureOriginal();
      valueX.min = 1;
      expect(valueX.hasDiff()).toBeFalsy();
    });

    it('should have a diff if something changes after the original is captured', () => {
      valueX.min = 1;
      valueX.captureOriginal();
      valueX.min = 2;
      expect(valueX.hasDiff()).toBeTruthy();
    });

    it('should detect diff correctly with explicit choices', () => {
      // Because we don't (yet) capture choice properties in the ElementDefinition class itself,
      // we need special logic around them.  So we should test it.
      // @ts-ignore
      valueX.fixedInteger = 1;
      valueX.captureOriginal();
      // @ts-ignore
      valueX.fixedInteger = 2;
      expect(valueX.hasDiff()).toBeTruthy();
      // @ts-ignore
      valueX.fixedInteger = 1;
      expect(valueX.hasDiff()).toBeFalsy();
    });

    it('should detect diffs and non-diffs correctly when elements are unfolded', () => {
      const code = observation.elements.find(e => e.id === 'Observation.code');
      code.unfold(getResolver(defs));
      const codeCoding = observation.elements.find(e => e.id === 'Observation.code.coding');
      const codeText = observation.elements.find(e => e.id === 'Observation.code.text');
      // Unfolded elements haven't been changed from their base definitions, so no diff...
      expect(code.hasDiff()).toBeFalsy();
      expect(codeCoding.hasDiff()).toBeFalsy();
      expect(codeText.hasDiff()).toBeFalsy();

      // Change just Observation.code.coding cardinality
      codeCoding.constrainCardinality(1, '*');

      // Only Observation.code.coding should have diff
      expect(code.hasDiff()).toBeFalsy();
      expect(codeCoding.hasDiff()).toBeTruthy();
      expect(codeText.hasDiff()).toBeFalsy();
    });
  });

  describe('#calculateDiff', () => {
    it('should have diff containing everything when there is no captured original', () => {
      const newElement = new ElementDefinition('newElement');
      newElement.min = 0;
      newElement.max = '1';
      newElement.type = [{ code: 'string' }];
      expect(newElement.calculateDiff()).toEqual(newElement);
    });

    it('should have a diff w/ only id and path when nothing changes after capturing original', () => {
      valueX.min = 1;
      valueX.captureOriginal();
      valueX.min = 1;
      const diff = valueX.calculateDiff();
      expect(diff.id).toBe('Observation.value[x]');
      expect(diff.path).toBe('Observation.value[x]');
      expect(Object.keys(diff.toJSON())).toHaveLength(2);
    });

    it('should have a diff containing changed elements after the original is captured', () => {
      valueX.min = 1;
      valueX.max = '2';
      valueX.captureOriginal();
      valueX.min = 2;
      const diff = valueX.calculateDiff();
      expect(diff.id).toBe('Observation.value[x]');
      expect(diff.path).toBe('Observation.value[x]');
      expect(diff.min).toBe(2);
      expect(Object.keys(diff.toJSON())).toHaveLength(3);
    });

    it('should calculate diff correctly with explicit choices', () => {
      // Because we don't (yet) capture choice properties in the ElementDefinition class itself,
      // we need special logic around them.  So we should test it.
      // @ts-ignore
      valueX.fixedInteger = 1;
      valueX.captureOriginal();
      // @ts-ignore
      valueX.fixedInteger = 2;
      const diff = valueX.calculateDiff();
      expect(diff.id).toBe('Observation.value[x]');
      expect(diff.path).toBe('Observation.value[x]');
      // @ts-ignore
      expect(diff.fixedInteger).toBe(2);
      expect(Object.keys(diff.toJSON())).toHaveLength(3);
    });

    it('should calculate diff id using shortcut syntax for a choice slice', () => {
      valueX.sliceIt('type', '$this', false, 'open');
      const valueString = valueX.addSlice('valueString', { code: 'string' });
      const diff = valueString.calculateDiff();
      expect(valueString.id).toBe('Observation.value[x]:valueString');
      expect(valueString.path).toBe('Observation.value[x]');
      expect(diff.id).toBe('Observation.valueString');
      expect(diff.path).toBe('Observation.valueString');
      expect(Object.keys(diff.toJSON()).length).toBe(Object.keys(valueString.toJSON()).length);
    });
  });

  describe('#parent', () => {
    it('should find the parent element of an element in a BackboneElement', () => {
      const child = observation.elements.find(
        e => e.path === 'Observation.component.interpretation'
      );
      const parent = child.parent();
      expect(parent.id).toBe('Observation.component');
    });

    it('should find the parent element of a top-level element', () => {
      const child = observation.elements.find(e => e.path === 'Observation.component');
      const parent = child.parent();
      expect(parent.id).toBe('Observation');
    });

    it('should find return undefined for the root element', () => {
      const root = observation.elements.find(e => e.path === 'Observation');
      const parent = root.parent();
      expect(parent).toBeUndefined();
    });
  });

  describe('#children', () => {
    it('should find the children of a backbone element', () => {
      const parent = observation.elements.find(e => e.path === 'Observation.component');
      const children = parent.children();
      expect(children).toHaveLength(8);
      expect(children[0].id).toBe('Observation.component.id');
      expect(children[1].id).toBe('Observation.component.extension');
      expect(children[2].id).toBe('Observation.component.modifierExtension');
      expect(children[3].id).toBe('Observation.component.code');
      expect(children[4].id).toBe('Observation.component.value[x]');
      expect(children[5].id).toBe('Observation.component.dataAbsentReason');
      expect(children[6].id).toBe('Observation.component.interpretation');
      expect(children[7].id).toBe('Observation.component.referenceRange');
    });

    it('should find no children for an element that is a leaf node', () => {
      const parent = observation.elements.find(e => e.path === 'Observation.code');
      const children = parent.children();
      expect(children).toEqual([]);
    });
  });

  describe('#unfold', () => {
    it('should add children when an element has a single type', () => {
      const numOriginalElements = observation.elements.length;
      const codeIdx = observation.elements.findIndex(e => e.path === 'Observation.code');
      const parent = observation.elements[codeIdx];
      expect(observation.elements[codeIdx + 1].id).toBe('Observation.subject');
      const newElements = parent.unfold(getResolver(defs));
      expect(newElements).toHaveLength(4);
      expect(newElements[0].id).toBe('Observation.code.id');
      expect(newElements[1].id).toBe('Observation.code.extension');
      expect(newElements[2].id).toBe('Observation.code.coding');
      expect(newElements[3].id).toBe('Observation.code.text');
      expect(observation.elements).toHaveLength(numOriginalElements + 4);
      expect(observation.elements[codeIdx + 1].id).toBe('Observation.code.id');
      expect(observation.elements[codeIdx + 2].id).toBe('Observation.code.extension');
      expect(observation.elements[codeIdx + 3].id).toBe('Observation.code.coding');
      expect(observation.elements[codeIdx + 4].id).toBe('Observation.code.text');
      expect(observation.elements[codeIdx + 5].id).toBe('Observation.subject');
    });

    it('should not add any children when an element has multiple types', () => {
      const numOriginalElements = observation.elements.length;
      const valueIdx = observation.elements.findIndex(e => e.path === 'Observation.value[x]');
      const parent = observation.elements[valueIdx];
      expect(observation.elements[valueIdx + 1].id).toBe('Observation.dataAbsentReason');
      const newElements = parent.unfold(getResolver(defs));
      expect(newElements).toEqual([]);
      expect(observation.elements).toHaveLength(numOriginalElements);
      expect(observation.elements[valueIdx + 1].id).toBe('Observation.dataAbsentReason');
    });
  });

  describe('#clone', () => {
    it('should clone an element so that changes in the clone are not reflected in the original', () => {
      const clone = valueX.clone(false);
      expect(clone).toEqual(valueX); // value-based equality (not sameness)
      clone.definition = 'I am a clone';
      expect(clone).not.toEqual(valueX);
    });

    it('should keep the same structdef reference', () => {
      const clone = valueX.clone();
      expect(clone.structDef).toBe(valueX.structDef);
    });

    it('should clear original by default', () => {
      valueX.captureOriginal();
      const clone = valueX.clone();
      // Best way to check state of original is by checking hasDiff
      expect(valueX.hasDiff()).toBeFalsy();
      expect(clone.hasDiff()).toBeTruthy();
    });
  });
});
