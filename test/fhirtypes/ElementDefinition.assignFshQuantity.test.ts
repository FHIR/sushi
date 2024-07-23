import path from 'path';
import { omit } from 'lodash';
import { loadFromPath } from 'fhir-package-loader';
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
    loadFromPath(path.join(__dirname, '..', 'testhelpers', 'testdefs'), 'r4-definitions', defs);
    fisher = new TestFisher().withFHIR(defs);
  });
  beforeEach(() => {
    observation = fisher.fishForStructureDefinition('Observation');
    fshQuantity1 = new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'));
    fshQuantity2 = new FshQuantity(1.24, new FshCode('mm', 'http://unitsofmeasure.org'));
    condition = fisher.fishForStructureDefinition('Condition');
    fshQuantityAge = new FshQuantity(42.0, new FshCode('a', 'http://unitsofmeasure.org'));
  });

  describe('#assignFshQuantity', () => {
    it('should assign a FshQuantity to a Quantity', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(fshQuantity1);
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(referenceRangeLow.fixedQuantity).toBeUndefined();
    });

    it('should assign a FshQuantity to a Quantity (exactly)', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(fshQuantity1, true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(referenceRangeLow.patternQuantity).toBeUndefined();
    });

    it('should assign a FshQuantity to a quantity specialization', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(fshQuantityAge, false, fisher);
      expect(onsetX.patternAge).toEqual({
        value: 42.0,
        code: 'a',
        system: 'http://unitsofmeasure.org'
      });
      expect(onsetX.fixedAge).toBeUndefined();
    });

    it('should assign a FshQuantity to a quantity specialization (exactly)', () => {
      const onsetX = condition.elements.find(e => e.id === 'Condition.onset[x]');
      onsetX.type = [new ElementDefinitionType('Age')];
      onsetX.assignValue(fshQuantityAge, true, fisher);
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
        valueX.assignValue(fshQuantity1);
      }).toThrow(
        'Cannot assign Quantity value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(fshQuantity1, true);
      }).toThrow(
        'Cannot assign Quantity value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(fshQuantity1);
      // should be able to assign a Quantity twice in the same way without issue
      referenceRangeLow.assignValue(fshQuantity1);
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      // different value
      expect(() => {
        referenceRangeLow.assignValue(fshQuantity2);
      }).toThrow(
        'Cannot assign 1.24 \'mm\' to this element; a different Quantity is already assigned: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
      expect(() => {
        referenceRangeLow.assignValue(fshQuantity2, true);
      }).toThrow(
        'Cannot assign 1.24 \'mm\' to this element; a different Quantity is already assigned: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value by fixed[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(fshQuantity1, true);
      // should be able to assign a Quantity twice in the same way without issue
      referenceRangeLow.assignValue(fshQuantity1, true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      expect(() => {
        referenceRangeLow.assignValue(fshQuantity2, true);
      }).toThrow(
        'Cannot assign 1.24 \'mm\' to this element; a different Quantity is already assigned: {"value":1.23,"code":"mm","system":"http://unitsofmeasure.org"}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a Quantity to a different value set in a parent by pattern[x]', () => {
      const valueRange = observation.findElementByPath('valueRange', fisher);
      // @ts-ignore
      valueRange.patternRange = { low: { value: 1.5 } };
      valueRange.unfold(fisher);
      const valueRangeLow = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueRange.low'
      );
      const clone = valueRangeLow.clone(false);
      expect(() => {
        valueRangeLow.assignValue(new FshQuantity(2.5));
      }).toThrow(
        'Cannot assign 2.5 to this element; a different Quantity is already assigned: {"value":1.5}.'
      );
      expect(() => {
        valueRangeLow.assignValue(new FshQuantity(2.5), true);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different Quantity is already assigned: {"value":1.5}.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(valueRangeLow, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when assigning a Quantity to a different value set in a parent by fixed[x]', () => {
      const valueRange = observation.findElementByPath('valueRange', fisher);
      // @ts-ignore
      valueRange.fixedRange = { low: { value: 1.5 } };
      valueRange.unfold(fisher);
      const valueRangeLow = observation.elements.find(
        e => e.id === 'Observation.value[x]:valueRange.low'
      );
      const clone = valueRangeLow.clone(false);
      expect(() => {
        valueRangeLow.assignValue(new FshQuantity(2.5));
      }).toThrow(
        'Cannot assign 2.5 to this element; a different Quantity is already assigned: {"value":1.5}.'
      );
      expect(() => {
        valueRangeLow.assignValue(new FshQuantity(2.5), true);
      }).toThrow(
        'Cannot assign 2.5 to this element; a different Quantity is already assigned: {"value":1.5}.'
      );
      expect(omit(clone, ['structDef', 'treeParent', 'treeChildren'])).toEqual(
        omit(valueRangeLow, ['structDef', 'treeParent', 'treeChildren'])
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value, no units by pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(new FshQuantity(1.23));
      // should be able to assign a Quantity twice in the same way without issue
      referenceRangeLow.assignValue(new FshQuantity(1.23));
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23
      });
      // different value
      expect(() => {
        referenceRangeLow.assignValue(new FshQuantity(3.21));
      }).toThrow(
        'Cannot assign 3.21 to this element; a different Quantity is already assigned: {"value":1.23}.'
      );
      expect(() => {
        referenceRangeLow.assignValue(new FshQuantity(3.21), true);
      }).toThrow(
        'Cannot assign 3.21 to this element; a different Quantity is already assigned: {"value":1.23}.'
      );
    });

    it('should throw ValueAlreadyAssignedError when the value is assigned to a different value, no units by fixed[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(new FshQuantity(1.23), true);
      // should be able to assign a Quantity twice in the same way without issue
      referenceRangeLow.assignValue(new FshQuantity(1.23), true);
      expect(referenceRangeLow.fixedQuantity).toEqual({
        value: 1.23
      });
      // different value
      expect(() => {
        referenceRangeLow.assignValue(new FshQuantity(3.21), true);
      }).toThrow(
        'Cannot assign 3.21 to this element; a different Quantity is already assigned: {"value":1.23}.'
      );
    });

    it('should throw AssignedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.assignValue(fshQuantity1, true);
      expect(() => {
        referenceRangeLow.assignValue(fshQuantity1);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedQuantity.'
      );
    });

    it('should throw MismatchedTypeError when the value is assigned to a non-Quantity', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.assignValue(fshQuantity2);
      }).toThrow(
        "Cannot assign Quantity value: 1.24 'mm'. Value does not match element type: code"
      );
      expect(() => {
        status.assignValue(fshQuantity2, true);
      }).toThrow(
        "Cannot assign Quantity value: 1.24 'mm'. Value does not match element type: code"
      );
      // without units
      expect(() => {
        status.assignValue(new FshQuantity(1.24));
      }).toThrow('Cannot assign Quantity value: 1.24. Value does not match element type: code');
      expect(() => {
        status.assignValue(new FshQuantity(1.24), true);
      }).toThrow('Cannot assign Quantity value: 1.24. Value does not match element type: code');
    });
  });
});
