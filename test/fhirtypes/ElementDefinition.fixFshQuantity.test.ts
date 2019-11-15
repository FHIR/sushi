import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode } from '../../src/fshtypes';

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

  describe('#fixFshQuantity', () => {
    it('should fix a FshQuantity to a Quantity', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixFshQuantity(
        new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'))
      );
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixFshQuantity(
          new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'))
        );
      }).toThrow(
        'Cannot fix Quantity value on this element since this element does not have a single type'
      );
    });

    it('should throw QuantityAlreadyFixedError when the value is fixed to a different value', () => {
      const referenceRangeLow = observation.elements.find(
        e => e.id === 'Observation.referenceRange.low'
      );
      referenceRangeLow.fixFshQuantity(
        new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'))
      );
      // should be able to fix a Quantity twice in the same way without issue
      referenceRangeLow.fixFshQuantity(
        new FshQuantity(1.23, new FshCode('mm', 'http://unitsofmeasure.org'))
      );
      expect(referenceRangeLow.patternQuantity).toEqual({
        value: 1.23,
        code: 'mm',
        system: 'http://unitsofmeasure.org'
      });
      // different value
      expect(() => {
        referenceRangeLow.fixFshQuantity(
          new FshQuantity(1.24, new FshCode('mm', 'http://unitsofmeasure.org'))
        );
      }).toThrow(
        'Cannot fix 1.24 mm to this element; a different Quantity is already fixed: 1.23 mm.'
      );
      // different units
      expect(() => {
        referenceRangeLow.fixFshQuantity(new FshQuantity(1.23));
      }).toThrow(
        'Cannot fix 1.23  to this element; a different Quantity is already fixed: 1.23 mm.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Quantity', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixFshQuantity(
          new FshQuantity(1.24, new FshCode('mm', 'http://unitsofmeasure.org'))
        );
      }).toThrow('Cannot fix Quantity value 1.24 mm on element of type code; types do not match.');
      // without units
      expect(() => {
        status.fixFshQuantity(new FshQuantity(1.24));
      }).toThrow('Cannot fix Quantity value 1.24  on element of type code; types do not match.');
    });
  });
});
