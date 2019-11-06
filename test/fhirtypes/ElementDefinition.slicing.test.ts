import findLastIndex from 'lodash/findLastIndex';
import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonObservation: any;
  let observation: StructureDefinition;
  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
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
      expect(systolicBP.sliceName).toBe('SystolicBP');
      expect(systolicBP.min).toBe(0);
      expect(systolicBP.max).toBe('*');
      expect(systolicBP.type).toEqual([{ code: 'BackboneElement' }]);
      expect(diastolicBP.id).toBe('Observation.component:DiastolicBP');
      expect(diastolicBP.path).toBe('Observation.component');
      expect(diastolicBP.sliceName).toBe('DiastolicBP');
      expect(diastolicBP.min).toBe(0);
      expect(diastolicBP.max).toBe('*');
      expect(diastolicBP.type).toEqual([{ code: 'BackboneElement' }]);
      expect(observation.elements[lastComponentIndex + 1]).toEqual(systolicBP);
      expect(observation.elements[lastComponentIndex + 2]).toEqual(diastolicBP);
    });

    it('should add slices for specific types in a choice', () => {
      const valueXIdx = observation.elements.findIndex(e => e.path === 'Observation.value[x]');
      const valueX = observation.elements[valueXIdx];
      valueX.sliceIt('type', '$this', false, 'open');
      const quantity = valueX.addSlice('valueQuantity', { code: 'Quantity' });
      const integer = valueX.addSlice('valueInteger', { code: 'integer' });
      expect(quantity.id).toBe('Observation.value[x]:valueQuantity');
      expect(quantity.path).toBe('Observation.value[x]');
      expect(quantity.sliceName).toBe('valueQuantity');
      expect(quantity.min).toBe(0);
      expect(quantity.max).toBe('1');
      expect(quantity.type).toEqual([{ code: 'Quantity' }]);
      expect(integer.id).toBe('Observation.value[x]:valueInteger');
      expect(integer.path).toBe('Observation.value[x]');
      expect(integer.sliceName).toBe('valueInteger');
      expect(integer.min).toBe(0);
      expect(integer.max).toBe('1');
      expect(integer.type).toEqual([{ code: 'integer' }]);
      expect(observation.elements[valueXIdx + 1]).toEqual(quantity);
      expect(observation.elements[valueXIdx + 2]).toEqual(integer);
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
