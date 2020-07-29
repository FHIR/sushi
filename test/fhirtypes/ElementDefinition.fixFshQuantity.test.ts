import path from 'path';
import { cloneDeep } from 'lodash';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';
import { ElementDefinitionType } from '../../src/fhirtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let condition: StructureDefinition;
  let observation: StructureDefinition;
  let fshQuantity1: FshQuantity;
  let fshQuantity2: FshQuantity;
  let fshQuantityAge: FshQuantity;
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
    fshQuantity1 = new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'));
    fshQuantity2 = new FshQuantity(1.24, new FshCode('mm', 'http://unitsofmeasure.org'));
    condition = fisher.fishForStructureDefinition('Condition');
    fshQuantityAge = new FshQuantity(42.0, new FshCode('a', 'http://unitsofmeasure.org'));
  });

  describe('#fixFshQuantity', () => {
    it('should fix a FshQuantity to a Quantity', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(fshQuantity1);
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(referenceRangeLow.fixedQuantity).toBeUndefined();
    });

    it('should fix a FshQuantity to a Quantity (exactly)', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(fshQuantity1, true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(referenceRangeLow.patternQuantity).toBeUndefined();
    });

    it('should fix a FshQuantity to a quantity specialization', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.fixValue(fshQuantityAge, false, fisher);
      expect(onsetX.patternAge).toEqual({
        value: 42.0,
        code: 'a',
        system: 'http://unitsofmeasure.org'
      });
      expect(onsetX.fixedAge).toBeUndefined();
    });

    it('should fix a FshQuantity to a quantity specialization (exactly)', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.fixValue(fshQuantityAge, true, fisher);
      expect(onsetX.fixedAge).toEqual({
        value: 42.0,
        code: 'a',
        system: 'http://unitsofmeasure.org'
      });
      expect(onsetX.patternAge).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fshQuantity1);
      }).toThrow(
        'Cannot fix Quantity value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(fshQuantity1, true);
      }).toThrow(
        'Cannot fix Quantity value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(fshQuantity1);
      // should be able to fix a Quantity twice in the same way without issue
      referenceRangeLow.fixValue(fshQuantity1);
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      // different value
      expect(() => {
        referenceRangeLow.fixValue(fshQuantity2);
      }).toThrow(
        'Cannot fix 1.24 \'mm\' to this element; a different Quantity is already fixed: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
      expect(() => {
        referenceRangeLow.fixValue(fshQuantity2, true);
      }).toThrow(
        'Cannot fix 1.24 \'mm\' to this element; a different Quantity is already fixed: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value by fixed[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(fshQuantity1, true);
      // should be able to fix a Quantity twice in the same way without issue
      referenceRangeLow.fixValue(fshQuantity1, true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(() => {
        referenceRangeLow.fixValue(fshQuantity2, true);
      }).toThrow(
        'Cannot fix 1.24 \'mm\' to this element; a different Quantity is already fixed: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
    });

    it('should throw ValueAlreadyFixedError when fixing a Quantity to a different value set in a parent by pattern[x]', () => {
      const valueRange = observation.findElementByPath('valueRange', fisher);
      // @ts-ignore
      valueRange.patternRange = { low: { value: 1.5 } };
      valueRange.unfold(fisher);
      const valueRangeLow = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueRange.low'
      );
      const clone = cloneDeep(valueRangeLow);
      expect(() => {
        valueRangeLow.fixValue(new FshQuantity(2.5));
      }).toThrow(
        'Cannot fix 2.5 to this element; a different Quantity is already fixed: {"value":1.5}.'
      );
      expect(() => {
        valueRangeLow.fixValue(new FshQuantity(2.5), true);
      }).toThrow(
        'Cannot fix 2.5 to this element; a different Quantity is already fixed: {"value":1.5}.'
      );
      expect(clone).toEqual(valueRangeLow);
    });

    it('should throw ValueAlreadyFixedError when fixing a Quantity to a different value set in a parent by fixed[x]', () => {
      const valueRange = observation.findElementByPath('valueRange', fisher);
      // @ts-ignore
      valueRange.fixedRange = { low: { value: 1.5 } };
      valueRange.unfold(fisher);
      const valueRangeLow = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueRange.low'
      );
      const clone = cloneDeep(valueRangeLow);
      expect(() => {
        valueRangeLow.fixValue(new FshQuantity(2.5));
      }).toThrow(
        'Cannot fix 2.5 to this element; a different Quantity is already fixed: {"value":1.5}.'
      );
      expect(() => {
        valueRangeLow.fixValue(new FshQuantity(2.5), true);
      }).toThrow(
        'Cannot fix 2.5 to this element; a different Quantity is already fixed: {"value":1.5}.'
      );
      expect(clone).toEqual(valueRangeLow);
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value, no units by pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(new FshQuantity(1.23));
      // should be able to fix a Quantity twice in the same way without issue
      referenceRangeLow.fixValue(new FshQuantity(1.23));
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23
      });
      // different value
      expect(() => {
        referenceRangeLow.fixValue(new FshQuantity(3.21));
      }).toThrow(
        'Cannot fix 3.21 to this element; a different Quantity is already fixed: {"value":1.23}.'
      );
      expect(() => {
        referenceRangeLow.fixValue(new FshQuantity(3.21), true);
      }).toThrow(
        'Cannot fix 3.21 to this element; a different Quantity is already fixed: {"value":1.23}.'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value, no units by fixed[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(new FshQuantity(1.23), true);
      // should be able to fix a Quantity twice in the same way without issue
      referenceRangeLow.fixValue(new FshQuantity(1.23), true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23
      });
      // different value
      expect(() => {
        referenceRangeLow.fixValue(new FshQuantity(3.21), true);
      }).toThrow(
        'Cannot fix 3.21 to this element; a different Quantity is already fixed: {"value":1.23}.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixValue(fshQuantity1, true);
      expect(() => {
        referenceRangeLow.fixValue(fshQuantity1);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedQuantity.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Quantity', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixValue(fshQuantity2);
        // eslint-disable-next-line
      }).toThrow("Cannot fix Quantity value: 1.24 'mm'. Value does not match element type: code");
      expect(() => {
        status.fixValue(fshQuantity2, true);
        // eslint-disable-next-line
      }).toThrow("Cannot fix Quantity value: 1.24 'mm'. Value does not match element type: code");
      // without units
      expect(() => {
        status.fixValue(new FshQuantity(1.24));
      }).toThrow('Cannot fix Quantity value: 1.24. Value does not match element type: code');
      expect(() => {
        status.fixValue(new FshQuantity(1.24), true);
      }).toThrow('Cannot fix Quantity value: 1.24. Value does not match element type: code');
    });
  });
});
