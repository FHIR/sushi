import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';
import path from 'path';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let observation: StructureDefinition;
  let fshQuantity1: FshQuantity;
  let fshQuantity2: FshQuantity;
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
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fshQuantity1);
      }).toThrow(
        'Cannot fix Quantity value on this element since this element does not have a single type'
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value', () => {
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
        // eslint-disable-next-line
        "Cannot fix 1.24 'mm' to this element; a different Quantity is already fixed: 1.23 'mm'."
      );
    });

    it('should throw ValueAlreadyFixedError when the value is fixed to a different value, no units', () => {
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
        // eslint-disable-next-line
        'Cannot fix 3.21 to this element; a different Quantity is already fixed: 1.23.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Quantity', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixValue(fshQuantity2);
        // eslint-disable-next-line
      }).toThrow("Cannot fix Quantity value: 1.24 'mm'. Value does not match element type: code");
      // without units
      expect(() => {
        status.fixValue(new FshQuantity(1.24));
      }).toThrow('Cannot fix Quantity value: 1.24. Value does not match element type: code');
    });
  });
});
