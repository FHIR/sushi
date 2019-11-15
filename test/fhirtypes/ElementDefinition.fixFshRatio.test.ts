import { load } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode, FshRatio } from '../../src/fshtypes';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let jsonMedication: any;
  let jsonObservation: any;
  let medication: StructureDefinition;
  let observation: StructureDefinition;

  beforeAll(() => {
    defs = load('4.0.1');
    jsonObservation = defs.findResource('Observation');
    jsonMedication = defs.findResource('Medication');
  });
  beforeEach(() => {
    observation = StructureDefinition.fromJSON(jsonObservation);
    medication = StructureDefinition.fromJSON(jsonMedication);
  });

  describe('#fixFshRatio', () => {
    it('should fix a FshRatio to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixFshRatio(
        new FshRatio(
          new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
          new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
        )
      );
      expect(amount.patternRatio).toEqual({
        numerator: {
          value: 1.2,
          code: 'mm',
          system: 'http://unitsofmeasure.org'
        },
        denominator: {
          value: 3.4,
          code: 'cm',
          system: 'http://unitsofmeasure.org'
        }
      });
    });

    it('should fix a FshRatio without units to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixFshRatio(new FshRatio(new FshQuantity(1.2), new FshQuantity(3.4)));
      expect(amount.patternRatio).toEqual({
        numerator: {
          value: 1.2
        },
        denominator: {
          value: 3.4
        }
      });
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixFshRatio(
          new FshRatio(
            new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
            new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
          )
        );
      }).toThrow(
        'Cannot fix Ratio value on this element since this element does not have a single type'
      );
    });

    it('should throw RatioAlreadyFixedError when the value is fixed to a different value', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixFshRatio(
        new FshRatio(
          new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
          new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
        )
      );
      // should be able to fix a Quantity twice in the same way without issue
      amount.fixFshRatio(
        new FshRatio(
          new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
          new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
        )
      );
      expect(amount.patternRatio).toEqual({
        numerator: {
          value: 1.2,
          code: 'mm',
          system: 'http://unitsofmeasure.org'
        },
        denominator: {
          value: 3.4,
          code: 'cm',
          system: 'http://unitsofmeasure.org'
        }
      });
      // different value
      expect(() => {
        amount.fixFshRatio(
          new FshRatio(
            new FshQuantity(1.3, new FshCode('mm', 'http://unitsofmeasure.org')),
            new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
          )
        );
      }).toThrow(
        'Cannot fix 1.3 mm : 3.4 cm to this element; a different Ratio is already fixed: 1.2 mm : 3.4 cm.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Ratio', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      const ratioUnits = new FshRatio(
        new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
        new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
      );
      const ratioNoUnits = new FshRatio(new FshQuantity(1.2), new FshQuantity(3.4));
      // with units
      expect(() => {
        status.fixFshRatio(ratioUnits);
      }).toThrow(
        'Cannot fix Ratio value 1.2 mm : 3.4 cm on element of type code; types do not match.'
      );
      // without units
      expect(() => {
        status.fixFshRatio(ratioNoUnits);
      }).toThrow('Cannot fix Ratio value 1.2  : 3.4  on element of type code; types do not match.');
    });
  });
});
