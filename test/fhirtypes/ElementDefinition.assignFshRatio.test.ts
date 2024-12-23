import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { FshQuantity, FshCode, FshRatio } from '../../src/fshtypes';
import { getTestFHIRDefinitions, testDefsPath, TestFisher } from '../testhelpers';

describe('ElementDefinition', () => {
  let defs: FHIRDefinitions;
  let medication: StructureDefinition;
  let observation: StructureDefinition;
  let fshRatio: FshRatio;
  let fshRatioNoUnits: FshRatio;
  let differentFshRatio: FshRatio;
  let fisher: TestFisher;
  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
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

  describe('#assignFshRatio', () => {
    it('should assign a FshRatio to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatio);
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

    it('should assign a FshRatio to a Ratio (exactly)', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatio, true);
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

    it('should assign a FshRatio without units to a Ratio', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatioNoUnits);
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

    it('should assign a FshRatio without units to a Ratio (exactly)', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatioNoUnits, true);
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
        valueX.assignValue(fshRatio);
      }).toThrow(
        'Cannot assign Ratio value on this element since this element does not have a single type'
      );
      expect(() => {
        valueX.assignValue(fshRatio, true);
      }).toThrow(
        'Cannot assign Ratio value on this element since this element does not have a single type'
      );
    });

    it('should throw RatioAlreadyAssignedError when the value is assigned to a different value by pattern[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatio);
      // should be able to assign a Ratio twice in the same way without issue
      amount.assignValue(fshRatio);
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
        amount.assignValue(differentFshRatio);
      }).toThrow(
        'Cannot assign 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      expect(() => {
        amount.assignValue(differentFshRatio, true);
      }).toThrow(
        'Cannot assign 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      // different units
      expect(() => {
        amount.assignValue(fshRatioNoUnits);
      }).toThrow(
        'Cannot assign 1.2 : 3.4 to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      expect(() => {
        amount.assignValue(fshRatioNoUnits, true);
      }).toThrow(
        'Cannot assign 1.2 : 3.4 to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
    });

    it('should throw RatioAlreadyAssignedError when the value is assigned to a different value by fixed[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatio, true);
      // should be able to assign a Ratio twice in the same way without issue
      amount.assignValue(fshRatio, true);
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
        amount.assignValue(differentFshRatio, true);
      }).toThrow(
        'Cannot assign 1.3 \'mm\' : 3.4 \'cm\' to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
      // different units
      expect(() => {
        amount.assignValue(fshRatioNoUnits, true);
      }).toThrow(
        'Cannot assign 1.2 : 3.4 to this element; a different Ratio is already assigned: {"numerator":{"value":1.2,"code":"mm","system":"http://unitsofmeasure.org"},"denominator":{"value":3.4,"code":"cm","system":"http://unitsofmeasure.org"}}.'
      );
    });

    it('should throw FixedToPatternError when trying to change fixed[x] to pattern[x]', () => {
      const amount = medication.elements.find(e => e.id === 'Medication.amount');
      amount.assignValue(fshRatio, true);
      // different value
      expect(() => {
        amount.assignValue(fshRatio);
      }).toThrow(
        'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using fixedRatio.'
      );
    });

    it('should throw MismatchedTypeError when the value is assigned to a non-Ratio', () => {
      const status = observation.elements.find(e => e.id === 'Observation.status');
      // with units
      expect(() => {
        status.assignValue(fshRatio);
      }).toThrow(
        "Cannot assign Ratio value: 1.2 'mm' : 3.4 'cm'. Value does not match element type: code"
      );
      expect(() => {
        status.assignValue(fshRatio, true);
      }).toThrow(
        "Cannot assign Ratio value: 1.2 'mm' : 3.4 'cm'. Value does not match element type: code"
      );
      // without units
      expect(() => {
        status.assignValue(fshRatioNoUnits);
      }).toThrow('Cannot assign Ratio value: 1.2 : 3.4. Value does not match element type: code');
      expect(() => {
        status.assignValue(fshRatioNoUnits, true);
      }).toThrow('Cannot assign Ratio value: 1.2 : 3.4. Value does not match element type: code');
    });
  });
});
