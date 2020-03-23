import path from 'path';
import { loadFromPath } from '../../src/fhirdefs/load';
import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode, FshRatio } from '../../src/fshtypes';
import { TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let medication: StructureDefinition;
  let observation: StructureDefinition;
  let fshRatio: FshRatio;
  let fshRatioNoUnits: FshRatio;
  let differentFshRatio: FshRatio;
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
    medication = fisher.fishForStructureDefinition('Medication');
    fshRatio = new FshRatio(
      new FshQuantity(1.2, new FshCode('mm', 'http://unitsofmeasure.org')),
      new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
    );
    fshRatioNoUnits = new FshRatio(new FshQuantity(1.2), new FshQuantity(3.4));
    differentFshRatio = new FshRatio(
      new FshQuantity(1.3, new FshCode('mm', 'http://unitsofmeasure.org')),
      new FshQuantity(3.4, new FshCode('cm', 'http://unitsofmeasure.org'))
    );
  });

  describe('#fixFshRatio', () => {
    it('should fix a FshRatio to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatio);
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
      expect(amount.fixedRatio).toBeUndefined();
    });

    it('should fix a FshRatio to a Ratio (exactly)', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatio, true);
      expect(amount.fixedRatio).toEqual({
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
      expect(amount.patternRatio).toBeUndefined();
    });

    it('should fix a FshRatio without units to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatioNoUnits);
      expect(amount.patternRatio).toEqual({
        numerator: {
          value: 1.2
        },
        denominator: {
          value: 3.4
        }
      });
      expect(amount.fixedRatio).toBeUndefined();
    });

    it('should fix a FshRatio without units to a Ratio (exactly)', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatioNoUnits, true);
      expect(amount.fixedRatio).toEqual({
        numerator: {
          value: 1.2
        },
        denominator: {
          value: 3.4
        }
      });
      expect(amount.patternRatio).toBeUndefined();
    });

    it('should throw NoSingleTypeError when element has multiple types', () => {
      const valueX = observation.elements.find(e => e.id === 'Observation.value[x]');
      expect(() => {
        valueX.fixValue(fshRatio);
      }).toThrow(
        'Cannot fix Ratio value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.fixValue(fshRatio, true);
      }).toThrow(
        'Cannot fix Ratio value on this element since this element does not have a single type'
      );
    });

    it('should throw RatioAlreadyFixedError when the value is fixed to a different value by pattern[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatio);
      // should be able to fix a Ratio twice in the same way without issue
      amount.fixValue(fshRatio);
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
        amount.fixValue(differentFshRatio);
      }).toThrow(
        'Cannot fix 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      expect(() => {
        amount.fixValue(differentFshRatio, true);
      }).toThrow(
        'Cannot fix 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      // different units
      expect(() => {
        amount.fixValue(fshRatioNoUnits);
      }).toThrow(
        'Cannot fix 1.2 : 3.4 to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      expect(() => {
        amount.fixValue(fshRatioNoUnits, true);
      }).toThrow(
        'Cannot fix 1.2 : 3.4 to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
    });

    it('should throw RatioAlreadyFixedError when the value is fixed to a different value by fixed[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatio, true);
      // should be able to fix a Ratio twice in the same way without issue
      amount.fixValue(fshRatio, true);
      expect(amount.fixedRatio).toEqual({
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
        amount.fixValue(differentFshRatio, true);
      }).toThrow(
        'Cannot fix 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      // different units
      expect(() => {
        amount.fixValue(fshRatioNoUnits, true);
      }).toThrow(
        'Cannot fix 1.2 : 3.4 to this element; a different Ratio is already fixed: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.fixValue(fshRatio, true);
      // different value
      expect(() => {
        amount.fixValue(fshRatio);
      }).toThrow(
        'Cannot fix this element using a pattern; as it is already fixed in the StructureDefinition using fixedRatio.'
      );
    });

    it('should throw MismatchedTypeError when the value is fixed to a non-Ratio', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.fixValue(fshRatio);
      }).toThrow(
        // eslint-disable-next-line
        "Cannot fix Ratio value: 1.2 'mm' : 3.4 'cm'. Value does not match element type: code"
      );
      expect(() => {
        status.fixValue(fshRatio, true);
      }).toThrow(
        // eslint-disable-next-line
        "Cannot fix Ratio value: 1.2 'mm' : 3.4 'cm'. Value does not match element type: code"
      );
      // without units
      expect(() => {
        status.fixValue(fshRatioNoUnits);
      }).toThrow('Cannot fix Ratio value: 1.2 : 3.4. Value does not match element type: code');
      expect(() => {
        status.fixValue(fshRatioNoUnits, true);
      }).toThrow('Cannot fix Ratio value: 1.2 : 3.4. Value does not match element type: code');
    });
  });
});
