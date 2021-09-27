import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ElementDefinition, ElementDefinitionType } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { TestFisher } from '../testhelpers';
import { Type } from '../../src/utils/Fishable';
import { Invariant, FshCode } from '../../src/fshtypes';
import path from 'path';
import { cloneDeep } from 'lodash';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let jsonValueX: any;
  let jsonValueId: any;
  let observation: StructureDefinition;
  let resprate: StructureDefinition;
  let valueX: ElementDefinition;
  let valueId: ElementDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
    // resolve observation once to ensure it is present in defs
    observation = fisher.fishForStructureDefinition('Observation');
    resprate = fisher.fishForStructureDefinition('resprate');
    jsonObservation = defs.fishForFHIR('Observation', Type.Resource);
    jsonValueX = jsonObservation.snapshot.element[21];
    jsonValueId = jsonObservation.snapshot.element[1];
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    resprate = fisher.fishForStructureDefinition('resprate');
    valueX = ElementDefinition.fromJSON(jsonValueX);
    valueId = ElementDefinition.fromJSON(jsonValueId);
    valueX.structDef = observation;
    valueId.structDef = observation;
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

  describe('#getSlices', () => {
    it('should get slices of an element', () => {
      const component = observation.elements.find(e => e.path === 'Observation.component');
      component.slicing = {
        ordered: false,
        rules: 'open',
        discriminator: [{ type: 'value', path: 'code' }]
      };
      const fooSlice = component.addSlice('FooSlice');
      const slices = component.getSlices();
      const newElements = fooSlice.unfold(fisher);
      const fooSliceExtension = newElements[1];
      expect(slices).toHaveLength(1);
      expect(slices[0].id).toEqual('Observation.component:FooSlice');
      expect(fooSliceExtension.getSlices()).toEqual([]);
    });
  });

  describe('#applyConstraints', () => {
    it('should apply a constraint based on an invariant with every field', () => {
      const invariant = new Invariant('MyInvariant');
      invariant.description = 'An invariant with all metadata specified.';
      invariant.expression = 'metadata.exists()';
      invariant.xpath = 'exists(f:metadata)';
      invariant.severity = new FshCode('error');

      valueX.applyConstraint(invariant, 'http://example.org/fhir/StructureDefinition/SomeProfile');

      expect(valueX.constraint).toHaveLength(2); // Adds an additional constraint
      expect(valueX.constraint[1].key).toEqual(invariant.name);
      expect(valueX.constraint[1]).toStrictEqual({
        key: invariant.name,
        severity: invariant.severity.code,
        human: invariant.description,
        expression: invariant.expression,
        xpath: invariant.xpath,
        source: 'http://example.org/fhir/StructureDefinition/SomeProfile'
      });
    });

    it('should apply a constraint with only fields specified on the the invariant', () => {
      const invariant = new Invariant('SimpleInvariant');
      invariant.description = 'The simplest invariant';
      invariant.severity = new FshCode('error');
      valueX.applyConstraint(invariant);

      expect(valueX.constraint).toHaveLength(2); // Adds an additional constraint
      expect(valueX.constraint[1].key).toEqual(invariant.name);
      expect(valueX.constraint[1]).toStrictEqual({
        key: invariant.name,
        human: invariant.description,
        severity: invariant.severity.code
      });
    });

    it('should apply a constraint to an ElementDefinition with no constraint array', () => {
      const invariant = new Invariant('MyInvariant');
      invariant.description = 'An invariant with all metadata specified.';
      invariant.expression = 'metadata.exists()';
      invariant.xpath = 'exists(f:metadata)';
      invariant.severity = new FshCode('error');
      expect(valueId.constraint).toBeUndefined(); // constraint initially undefined

      valueId.applyConstraint(invariant, 'http://example.org/fhir/StructureDefinition/SomeProfile');

      expect(valueId.constraint).toHaveLength(1); // Adds an additional constraint
      expect(valueId.constraint[0].key).toEqual(invariant.name);
      expect(valueId.constraint[0]).toStrictEqual({
        key: invariant.name,
        severity: invariant.severity.code,
        human: invariant.description,
        expression: invariant.expression,
        xpath: invariant.xpath,
        source: 'http://example.org/fhir/StructureDefinition/SomeProfile'
      });
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
      code.unfold(fisher);
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

    it('should detect a diff on a slice element with changed children', () => {
      const vsCatCoding = resprate.elements.find(e => e.id === 'Observation.category:VSCat.coding');
      const vsCat = resprate.elements.find(e => e.id === 'Observation.category:VSCat');
      expect(vsCatCoding.hasDiff()).toBeFalsy();
      expect(vsCat.hasDiff()).toBeFalsy();
      vsCatCoding.min = 2;
      expect(vsCatCoding.hasDiff()).toBeTruthy();
      expect(vsCat.hasDiff()).toBeTruthy();
    });

    it('should detect a diff on a slice element with changed grandchildren', () => {
      const vsCatCodingId = resprate.elements.find(
        e => e.id === 'Observation.category:VSCat.coding.id'
      );
      const vsCat = resprate.elements.find(e => e.id === 'Observation.category:VSCat');
      expect(vsCatCodingId.hasDiff()).toBeFalsy();
      expect(vsCat.hasDiff()).toBeFalsy();
      vsCatCodingId.short = 'id';
      expect(vsCatCodingId.hasDiff()).toBeTruthy();
      expect(vsCat.hasDiff()).toBeTruthy();
    });

    it('should not detect a diff on a slice element with no changed descendents', () => {
      const vsCatCoding = resprate.elements.find(e => e.id === 'Observation.category:VSCat.coding');
      const vsCat = resprate.elements.find(e => e.id === 'Observation.category:VSCat');
      expect(vsCatCoding.hasDiff()).toBeFalsy();
      expect(vsCat.hasDiff()).toBeFalsy();
      vsCatCoding.min = 1;
      expect(vsCatCoding.hasDiff()).toBeFalsy();
      expect(vsCat.hasDiff()).toBeFalsy();
    });

    it('should detect a diff on a sliced element with changed children', () => {
      const catCoding = resprate.findElementByPath('category.coding', fisher);
      const cat = resprate.elements.find(e => e.id === 'Observation.category');
      expect(catCoding.hasDiff()).toBeFalsy();
      expect(cat.hasDiff()).toBeFalsy();
      catCoding.min = 2;
      expect(catCoding.hasDiff()).toBeTruthy();
      expect(cat.hasDiff()).toBeTruthy();
    });

    it('should detect a diff on a sliced element with changed grandchildren', () => {
      const catCodingId = resprate.findElementByPath('category.coding.id', fisher);
      const cat = resprate.elements.find(e => e.id === 'Observation.category');
      expect(catCodingId.hasDiff()).toBeFalsy();
      expect(cat.hasDiff()).toBeFalsy();
      catCodingId.short = 'id';
      expect(catCodingId.hasDiff()).toBeTruthy();
      expect(cat.hasDiff()).toBeTruthy();
    });

    it('should not detect a diff on a sliced element with no changed descendents', () => {
      const vsCatCoding = resprate.elements.find(e => e.id === 'Observation.category:VSCat.coding');
      const cat = resprate.elements.find(e => e.id === 'Observation.category');
      expect(vsCatCoding.hasDiff()).toBeFalsy();
      expect(cat.hasDiff()).toBeFalsy();
      vsCatCoding.min = 2;
      expect(vsCatCoding.hasDiff()).toBeTruthy();
      // Changed child of slice, not of sliced element, should have no change
      expect(cat.hasDiff()).toBeFalsy();
    });
  });

  describe('#calculateDiff', () => {
    it('should have diff containing everything when there is no captured original', () => {
      const newElement = new ElementDefinition('newElement');
      newElement.min = 0;
      newElement.max = '1';
      newElement.type = [new ElementDefinitionType('string')];
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
      const valueString = valueX.addSlice('valueString', new ElementDefinitionType('string'));
      const diff = valueString.calculateDiff();
      // snapshot should retain formal syntax and slicename
      expect(valueString.id).toBe('Observation.value[x]:valueString');
      expect(valueString.path).toBe('Observation.value[x]');
      expect(valueString.sliceName).toBe('valueString');
      // differential should use shortcut syntax and remove slicename
      expect(diff.id).toBe('Observation.valueString');
      expect(diff.path).toBe('Observation.valueString');
      expect(diff.sliceName).toBeUndefined();
    });

    it('should include only new constraints in a diff when constraints are added', () => {
      const myInvariant = new Invariant('inv-1');
      myInvariant.severity = new FshCode('warning');
      myInvariant.description = 'This is a good idea.';
      valueX.applyConstraint(myInvariant, 'http://example.org');
      const diff = valueX.calculateDiff();
      expect(valueX.constraint.length).toBeGreaterThan(diff.constraint.length);
      expect(diff.constraint).toHaveLength(1);
      expect(diff.constraint[0]).toEqual({
        key: 'inv-1',
        source: 'http://example.org',
        severity: 'warning',
        human: 'This is a good idea.'
      });
    });

    it('should not include an empty mapping property in the diff', () => {
      valueX.setInstancePropertyByPath(
        'constraint[0].human',
        'All FHIR elements must have a @value or children',
        fisher
      );
      const diff = valueX.calculateDiff();
      expect(diff.constraint).toBeUndefined();
    });

    it('should include only new mappings in a diff when mappings are added', () => {
      valueX.applyMapping('test1', 'test1.value', 'Test value mapping', null);
      const diff = valueX.calculateDiff();
      expect(valueX.mapping.length).toBeGreaterThan(diff.mapping.length);
      expect(diff.mapping).toHaveLength(1);
      expect(diff.mapping[0]).toEqual({
        identity: 'test1',
        map: 'test1.value',
        comment: 'Test value mapping'
      });
    });

    it('should not include an empty mapping property in the diff', () => {
      valueX.setInstancePropertyByPath('mapping[0].identity', 'sct-concept', fisher);
      valueX.setInstancePropertyByPath(
        'mapping[0].map',
        '< 441742003 |Evaluation finding|',
        fisher
      );
      const diff = valueX.calculateDiff();
      expect(diff.mapping).toBeUndefined();
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
      const newElements = parent.unfold(fisher);
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

    it('should add children from the Structure Definition when they exist', () => {
      const numOriginalElements = observation.elements.length;
      const component = observation.elements.find(e => e.path === 'Observation.component');
      component.slicing = {
        ordered: false,
        rules: 'open',
        discriminator: [{ type: 'value', path: 'code' }]
      };
      const componentSlice = component.addSlice('FooSlice');
      const componentSliceIdx = observation.elements.findIndex(e => e.id === componentSlice.id);
      const newElements = componentSlice.unfold(fisher);
      expect(newElements).toHaveLength(8);
      expect(newElements[0].id).toBe('Observation.component:FooSlice.id');
      expect(newElements[1].id).toBe('Observation.component:FooSlice.extension');
      expect(newElements[2].id).toBe('Observation.component:FooSlice.modifierExtension');
      expect(newElements[3].id).toBe('Observation.component:FooSlice.code');
      expect(newElements[4].id).toBe('Observation.component:FooSlice.value[x]');
      expect(newElements[5].id).toBe('Observation.component:FooSlice.dataAbsentReason');
      expect(newElements[6].id).toBe('Observation.component:FooSlice.interpretation');
      expect(newElements[7].id).toBe('Observation.component:FooSlice.referenceRange');
      expect(observation.elements).toHaveLength(numOriginalElements + 9);
      expect(observation.elements[componentSliceIdx + 1].id).toBe(
        'Observation.component:FooSlice.id'
      );
      expect(observation.elements[componentSliceIdx + 2].id).toBe(
        'Observation.component:FooSlice.extension'
      );
      expect(observation.elements[componentSliceIdx + 3].id).toBe(
        'Observation.component:FooSlice.modifierExtension'
      );
      expect(observation.elements[componentSliceIdx + 4].id).toBe(
        'Observation.component:FooSlice.code'
      );
      expect(observation.elements[componentSliceIdx + 5].id).toBe(
        'Observation.component:FooSlice.value[x]'
      );
      expect(observation.elements[componentSliceIdx + 6].id).toBe(
        'Observation.component:FooSlice.dataAbsentReason'
      );
      expect(observation.elements[componentSliceIdx + 7].id).toBe(
        'Observation.component:FooSlice.interpretation'
      );
      expect(observation.elements[componentSliceIdx + 8].id).toBe(
        'Observation.component:FooSlice.referenceRange'
      );
    });

    it('should add children in the right location when one slicename is a substring of another', () => {
      // Tests bug reported here: https://github.com/FHIR/sushi/issues/122
      const numOriginalElements = observation.elements.length;
      const component = observation.elements.find(e => e.path === 'Observation.component');
      component.slicing = {
        ordered: false,
        rules: 'open',
        discriminator: [{ type: 'value', path: 'code' }]
      };
      // Set up the slices first
      const fooSlice = component.addSlice('FooSlice');
      const fooSliceBar = component.addSlice('FooSliceBar');
      // Then unfold them
      const newFooSliceElements = fooSlice.unfold(fisher);
      expect(newFooSliceElements).toHaveLength(8);
      expect(newFooSliceElements[0].id).toBe('Observation.component:FooSlice.id');
      expect(newFooSliceElements[1].id).toBe('Observation.component:FooSlice.extension');
      expect(newFooSliceElements[2].id).toBe('Observation.component:FooSlice.modifierExtension');
      expect(newFooSliceElements[3].id).toBe('Observation.component:FooSlice.code');
      expect(newFooSliceElements[4].id).toBe('Observation.component:FooSlice.value[x]');
      expect(newFooSliceElements[5].id).toBe('Observation.component:FooSlice.dataAbsentReason');
      expect(newFooSliceElements[6].id).toBe('Observation.component:FooSlice.interpretation');
      expect(newFooSliceElements[7].id).toBe('Observation.component:FooSlice.referenceRange');
      const newFooSliceBarElements = fooSliceBar.unfold(fisher);
      expect(newFooSliceBarElements).toHaveLength(8);
      expect(newFooSliceBarElements[0].id).toBe('Observation.component:FooSliceBar.id');
      expect(newFooSliceBarElements[1].id).toBe('Observation.component:FooSliceBar.extension');
      expect(newFooSliceBarElements[2].id).toBe(
        'Observation.component:FooSliceBar.modifierExtension'
      );
      expect(newFooSliceBarElements[3].id).toBe('Observation.component:FooSliceBar.code');
      expect(newFooSliceBarElements[4].id).toBe('Observation.component:FooSliceBar.value[x]');
      expect(newFooSliceBarElements[5].id).toBe(
        'Observation.component:FooSliceBar.dataAbsentReason'
      );
      expect(newFooSliceBarElements[6].id).toBe('Observation.component:FooSliceBar.interpretation');
      expect(newFooSliceBarElements[7].id).toBe('Observation.component:FooSliceBar.referenceRange');
      expect(observation.elements).toHaveLength(numOriginalElements + 18);
      // Then check they are in right order, starting with plain old Observation.component
      const componentIdx = observation.elements.findIndex(e => e.id === 'Observation.component');
      expect(observation.elements[componentIdx + 1].id).toBe('Observation.component.id');
      expect(observation.elements[componentIdx + 2].id).toBe('Observation.component.extension');
      expect(observation.elements[componentIdx + 3].id).toBe(
        'Observation.component.modifierExtension'
      );
      expect(observation.elements[componentIdx + 4].id).toBe('Observation.component.code');
      expect(observation.elements[componentIdx + 5].id).toBe('Observation.component.value[x]');
      expect(observation.elements[componentIdx + 6].id).toBe(
        'Observation.component.dataAbsentReason'
      );
      expect(observation.elements[componentIdx + 7].id).toBe(
        'Observation.component.interpretation'
      );
      expect(observation.elements[componentIdx + 8].id).toBe(
        'Observation.component.referenceRange'
      );
      expect(observation.elements[componentIdx + 9].id).toBe('Observation.component:FooSlice');
      expect(observation.elements[componentIdx + 10].id).toBe('Observation.component:FooSlice.id');
      expect(observation.elements[componentIdx + 11].id).toBe(
        'Observation.component:FooSlice.extension'
      );
      expect(observation.elements[componentIdx + 12].id).toBe(
        'Observation.component:FooSlice.modifierExtension'
      );
      expect(observation.elements[componentIdx + 13].id).toBe(
        'Observation.component:FooSlice.code'
      );
      expect(observation.elements[componentIdx + 14].id).toBe(
        'Observation.component:FooSlice.value[x]'
      );
      expect(observation.elements[componentIdx + 15].id).toBe(
        'Observation.component:FooSlice.dataAbsentReason'
      );
      expect(observation.elements[componentIdx + 16].id).toBe(
        'Observation.component:FooSlice.interpretation'
      );
      expect(observation.elements[componentIdx + 17].id).toBe(
        'Observation.component:FooSlice.referenceRange'
      );
      expect(observation.elements[componentIdx + 18].id).toBe('Observation.component:FooSliceBar');
      expect(observation.elements[componentIdx + 19].id).toBe(
        'Observation.component:FooSliceBar.id'
      );
      expect(observation.elements[componentIdx + 20].id).toBe(
        'Observation.component:FooSliceBar.extension'
      );
      expect(observation.elements[componentIdx + 21].id).toBe(
        'Observation.component:FooSliceBar.modifierExtension'
      );
      expect(observation.elements[componentIdx + 22].id).toBe(
        'Observation.component:FooSliceBar.code'
      );
      expect(observation.elements[componentIdx + 23].id).toBe(
        'Observation.component:FooSliceBar.value[x]'
      );
      expect(observation.elements[componentIdx + 24].id).toBe(
        'Observation.component:FooSliceBar.dataAbsentReason'
      );
      expect(observation.elements[componentIdx + 25].id).toBe(
        'Observation.component:FooSliceBar.interpretation'
      );
      expect(observation.elements[componentIdx + 26].id).toBe(
        'Observation.component:FooSliceBar.referenceRange'
      );
    });

    it('should not add any children when an element has multiple types', () => {
      const numOriginalElements = observation.elements.length;
      const valueIdx = observation.elements.findIndex(e => e.path === 'Observation.value[x]');
      const parent = observation.elements[valueIdx];
      expect(observation.elements[valueIdx + 1].id).toBe('Observation.dataAbsentReason');
      const newElements = parent.unfold(fisher);
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

  describe('#ElementDefinitionType get code', () => {
    it('should return valueUrl value when extension of fhir-type (R4)', () => {
      const code = valueId.type[0].code;
      const trueCodeValue = valueId.type[0].getActualCode();
      expect(code).toEqual('string');
      expect(trueCodeValue).toEqual('http://hl7.org/fhirpath/System.String');
    });

    it('should return valueUri value when extension of fhir-type (R5)', () => {
      // Create an R5 representation of the valueId (using valueUri instead of valueUrl)
      const jsonValueIdR5 = cloneDeep(jsonValueId);
      delete jsonValueIdR5.type[0].extension[0].valueUrl;
      jsonValueIdR5.type[0].extension[0].valueUri = 'string';
      const valueIdR5 = ElementDefinition.fromJSON(jsonValueIdR5);

      const code = valueIdR5.type[0].code;
      const trueCodeValue = valueIdR5.type[0].getActualCode();
      expect(code).toEqual('string');
      expect(trueCodeValue).toEqual('http://hl7.org/fhirpath/System.String');
    });

    it('should return code value when extension is not of fhir-type', () => {
      const code = valueX.type[0].code;
      expect(code).toEqual('Quantity');
    });
  });
});
