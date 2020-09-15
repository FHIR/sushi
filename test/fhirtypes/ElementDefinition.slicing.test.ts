import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { ElementDefinitionType } from '../../src/fhirtypes';
import { TestFisher } from '../testhelpers';
import findLastIndex from 'lodash/findLastIndex';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fisher: TestFisher;
  beforeAll(() => {
    defs = new FHIRDefinitions();
    loadFromPath(
      path.join(__dirname, '..', 'testhelpers', 'testdefs', 'package'),
      'testPackage',
      defs
    );
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
  });

  describe('#sliceIt()', () => {
    it('should slice an array, defaulting to unordered and open', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      const slicing = component.sliceIt('pattern', 'code');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('open');
      expect(component.slicing).toEqual(slicing);
    });

    it('should slice an array with specified ordered and rules values', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      const slicing = component.sliceIt('pattern', 'code', true, 'closed');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(true);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should not do anything if the slicing is the same as what already exists - no ordered/rules specified', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('open');
      expect(component.slicing).toEqual(slicing);
    });

    it('should not do anything if the slicing is the same as what already exists with ordered/rules specified', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', true, 'closed');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', true, 'closed');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(true);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should add another discriminator if the type is different from what already exists', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', true, 'closed');
      // Constrain slicing
      const slicing = component.sliceIt('value', 'code', true, 'closed');
      expect(slicing.discriminator).toHaveLength(2);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.discriminator[1].type).toBe('value');
      expect(slicing.discriminator[1].path).toBe('code');
      expect(slicing.ordered).toBe(true);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should add another discriminator if the path is different from what already exists', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', true, 'closed');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'interpretation', true, 'closed');
      expect(slicing.discriminator).toHaveLength(2);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.discriminator[1].type).toBe('pattern');
      expect(slicing.discriminator[1].path).toBe('interpretation');
      expect(slicing.ordered).toBe(true);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should allow slicing ordered to be constrained from false to true', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'open');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', true, 'open');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(true);
      expect(slicing.rules).toBe('open');
      expect(component.slicing).toEqual(slicing);
    });

    it('should throw when slicing ordered is constrained from true to false', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', true, 'open');
      // Constrain slicing
      expect(() => {
        component.sliceIt('pattern', 'code', false, 'open');
      }).toThrow(/'ordered' from true to false/);
    });

    it('should allow slicing rules to be constrained from open to open', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'open');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'open');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('open');
      expect(component.slicing).toEqual(slicing);
    });

    it('should allow slicing rules to be constrained from open to openAtEnd', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'open');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'openAtEnd');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('openAtEnd');
      expect(component.slicing).toEqual(slicing);
    });

    it('should allow slicing rules to be constrained from open to closed', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'open');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'closed');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should allow slicing rules to be constrained from openAtEnd to openAtEnd', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'openAtEnd');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'openAtEnd');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('openAtEnd');
      expect(component.slicing).toEqual(slicing);
    });

    it('should allow slicing rules to be constrained from openAtEnd to closed', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'openAtEnd');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'closed');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should throw when slicing rules is constrained from openAtEnd to open', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'openAtEnd');
      // Constrain slicing
      expect(() => {
        component.sliceIt('pattern', 'code', false, 'open');
      }).toThrow(/'rules' from openAtEnd to open/);
    });

    it('should allow slicing rules to be constrained from closed to closed', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'closed');
      // Constrain slicing
      const slicing = component.sliceIt('pattern', 'code', false, 'closed');
      expect(slicing.discriminator).toHaveLength(1);
      expect(slicing.discriminator[0].type).toBe('pattern');
      expect(slicing.discriminator[0].path).toBe('code');
      expect(slicing.ordered).toBe(false);
      expect(slicing.rules).toBe('closed');
      expect(component.slicing).toEqual(slicing);
    });

    it('should throw when slicing rules is constrained from closed to openAtEnd', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'closed');
      // Constrain slicing
      expect(() => {
        component.sliceIt('pattern', 'code', false, 'openAtEnd');
      }).toThrow(/'rules' from closed to openAtEnd/);
    });

    it('should throw when slicing rules is constrained from closed to open', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // Setup original slicing
      component.sliceIt('pattern', 'code', false, 'closed');
      // Constrain slicing
      expect(() => {
        component.sliceIt('pattern', 'code', false, 'open');
      }).toThrow(/'rules' from closed to open/);
    });
  });

  describe('#addSlice', () => {
    it('should add slices when a slicing is present', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      const lastComponentIndex = findLastIndex(observation.elements, e =>
        e.id.startsWith('Observation.component.')
      );
      component.sliceIt('pattern', 'code', false, 'open');
      const systolicBP = component.addSlice('SystolicBP');
      const diastolicBP = component.addSlice('DiastolicBP');
      expect(systolicBP.id).toBe('Observation.component:SystolicBP');
      expect(systolicBP.path).toBe('Observation.component');
      expect(systolicBP.slicing).toBeUndefined();
      expect(systolicBP.sliceName).toBe('SystolicBP');
      expect(systolicBP.min).toBe(0);
      expect(systolicBP.max).toBe('*');
      expect(systolicBP.type).toHaveLength(1);
      expect(systolicBP.type[0]).toEqual(new ElementDefinitionType('BackboneElement'));
      const systolicDiff = systolicBP.calculateDiff();
      expect(systolicDiff.min).toBe(0);
      expect(systolicDiff.max).toBe('*');
      expect(diastolicBP.id).toBe('Observation.component:DiastolicBP');
      expect(diastolicBP.path).toBe('Observation.component');
      expect(diastolicBP.slicing).toBeUndefined();
      expect(diastolicBP.sliceName).toBe('DiastolicBP');
      expect(diastolicBP.min).toBe(0);
      expect(diastolicBP.max).toBe('*');
      expect(diastolicBP.type).toHaveLength(1);
      expect(diastolicBP.type[0]).toEqual(new ElementDefinitionType('BackboneElement'));
      expect(observation.elements[lastComponentIndex + 1]).toEqual(systolicBP);
      expect(observation.elements[lastComponentIndex + 2]).toEqual(diastolicBP);
      const diastolicDiff = diastolicBP.calculateDiff();
      expect(diastolicDiff.min).toBe(0);
      expect(diastolicDiff.max).toBe('*');
    });

    it('should add slices for specific types in a choice', () => {
      const valueXIdx = observation.elements.findIndex(e => e.path === 'Observation.value[x]');
      const valueX = observation.elements[valueXIdx];
      valueX.sliceIt('type', '$this', false, 'open');
      const quantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      const integer = valueX.addSlice('valueInteger', new ElementDefinitionType('integer'));
      expect(quantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(quantity.path).toBe('Observation.value[x]');
      expect(quantity.slicing).toBeUndefined();
      expect(quantity.sliceName).toBe('valueQuantity');
      expect(quantity.min).toBe(0);
      expect(quantity.max).toBe('1');
      expect(quantity.type).toHaveLength(1);
      expect(quantity.type[0]).toEqual(new ElementDefinitionType('Quantity'));
      expect(integer.id).toBe('Observation.value[x]:valueInteger');
      expect(integer.path).toBe('Observation.value[x]');
      expect(integer.slicing).toBeUndefined();
      expect(integer.sliceName).toBe('valueInteger');
      expect(integer.min).toBe(0);
      expect(integer.max).toBe('1');
      expect(integer.type).toHaveLength(1);
      expect(integer.type[0]).toEqual(new ElementDefinitionType('integer'));
      expect(observation.elements[valueXIdx + 1]).toEqual(quantity);
      expect(observation.elements[valueXIdx + 2]).toEqual(integer);
    });

    it('should reduce min to 0 when addings slices for specific types in a choice of types', () => {
      const valueX = observation.elements.find(e => e.path === 'Observation.value[x]');
      // set value[x] min to 1 to test that slice mins are reduced to 0 (to allow other choices)
      valueX.min = 1;
      valueX.sliceIt('type', '$this', false, 'open');
      const quantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      const integer = valueX.addSlice('valueInteger', new ElementDefinitionType('integer'));
      expect(quantity.min).toBe(0);
      expect(quantity.max).toBe('1');
      expect(integer.min).toBe(0);
      expect(integer.max).toBe('1');
    });

    it('should NOT reduce min to 0 when adding a slice for specific types in a choice of only one type', () => {
      // NOTE: It's up for debate whether we should make explicit choices when there only is one option anyway,
      // but for now, we do.  So... we need to test this use case.
      const valueX = observation.elements.find(e => e.path === 'Observation.value[x]');
      // Remove all but the Quantity choice from value[x]
      valueX.type = valueX.type.filter(t => t.code === 'Quantity');
      // set value[x] min to 1 to test that slice min remains at 1
      valueX.min = 1;
      valueX.sliceIt('type', '$this', false, 'open');
      const quantity = valueX.addSlice('valueQuantity', new ElementDefinitionType('Quantity'));
      expect(quantity.min).toBe(1);
      expect(quantity.max).toBe('1');
    });

    it('should reslice when slicing a slice', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      const lastComponentIndex = findLastIndex(observation.elements, e =>
        e.id.startsWith('Observation.component.')
      );
      component.sliceIt('pattern', 'code', false, 'open');
      const systolicBP = component.addSlice('SystolicBP');
      const diastolicBP = component.addSlice('DiastolicBP');
      systolicBP.sliceIt('pattern', 'interpretation', false, 'open');
      const fooSlice = systolicBP.addSlice('Foo');
      expect(fooSlice.id).toBe('Observation.component:SystolicBP/Foo');
      expect(fooSlice.path).toBe('Observation.component');
      expect(fooSlice.slicing).toBeUndefined();
      expect(fooSlice.sliceName).toBe('SystolicBP/Foo');
      expect(fooSlice.min).toBe(0);
      expect(fooSlice.max).toBe('*');
      expect(fooSlice.type).toHaveLength(1);
      expect(fooSlice.type[0]).toEqual(new ElementDefinitionType('BackboneElement'));
      const fooDiff = fooSlice.calculateDiff();
      expect(fooDiff.min).toBe(0);
      expect(fooDiff.max).toBe('*');
      expect(observation.elements[lastComponentIndex + 1]).toEqual(systolicBP);
      expect(observation.elements[lastComponentIndex + 2]).toEqual(fooSlice);
      expect(observation.elements[lastComponentIndex + 3]).toEqual(diastolicBP);
    });

    it('should reslice when slicing a reslice', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      const lastComponentIndex = findLastIndex(observation.elements, e =>
        e.id.startsWith('Observation.component.')
      );
      component.sliceIt('pattern', 'code', false, 'open');
      const systolicBP = component.addSlice('SystolicBP');
      const diastolicBP = component.addSlice('DiastolicBP');
      systolicBP.sliceIt('pattern', 'interpretation', false, 'open');
      const fooSlice = systolicBP.addSlice('Foo');
      fooSlice.sliceIt('pattern', 'dataAbsentReason', false, 'open');
      const barSlice = fooSlice.addSlice('Bar');
      expect(barSlice.id).toBe('Observation.component:SystolicBP/Foo/Bar');
      expect(barSlice.path).toBe('Observation.component');
      expect(barSlice.slicing).toBeUndefined();
      expect(barSlice.sliceName).toBe('SystolicBP/Foo/Bar');
      expect(barSlice.min).toBe(0);
      expect(barSlice.max).toBe('*');
      expect(barSlice.type).toHaveLength(1);
      expect(barSlice.type[0]).toEqual(new ElementDefinitionType('BackboneElement'));
      const barDiff = barSlice.calculateDiff();
      expect(barDiff.min).toBe(0);
      expect(barDiff.max).toBe('*');
      expect(observation.elements[lastComponentIndex + 1]).toEqual(systolicBP);
      expect(observation.elements[lastComponentIndex + 2]).toEqual(fooSlice);
      expect(observation.elements[lastComponentIndex + 3]).toEqual(barSlice);
      expect(observation.elements[lastComponentIndex + 4]).toEqual(diastolicBP);
    });

    it('should throw when no slicing is present', () => {
      const component = observation.elements.find(e => e.id === 'Observation.component');
      // NOTE: intentionally not adding a slicing
      expect(() => {
        component.addSlice('SystolicBP');
      }).toThrow(/Cannot create SystolicBP slice/);
    });
  });
});
