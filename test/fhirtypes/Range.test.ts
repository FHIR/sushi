import cloneDeep from 'lodash/cloneDeep';
import { Range, validateRange } from '../../src/fhirtypes/Range';
import { Quantity } from '../../src/fhirtypes/Quantity';
import { InvalidRangeValueError } from '../../src/errors/InvalidRangeValueError';
import { UnitMismatchError } from '../../src/errors/UnitMismatchError';
import { CodeAndSystemMismatchError } from '../../src/errors/CodeAndSystemMismatchError';

describe('Range', () => {
  let small: Quantity;
  let large: Quantity;

  beforeAll(() => {
    small = {
      value: 2,
      unit: 'UCUM#mm',
      system: 'http://unitsofmeasure.org',
      code: 'mm'
    };
    large = {
      value: 25,
      unit: 'UCUM#mm',
      system: 'http://unitsofmeasure.org',
      code: 'mm'
    };
  });

  describe('#validateRange', () => {
    it('should be valid when one bound or both bounds are undefined', () => {
      const onlyLow: Range = {
        low: large
      };
      const onlyHigh: Range = {
        high: small
      };
      const neitherBound: Range = {};
      expect(validateRange(onlyLow)).toBe(true);
      expect(validateRange(onlyHigh)).toBe(true);
      expect(validateRange(neitherBound)).toBe(true);
    });
    it('should require low bound value to be less than or equal to high bound value', () => {
      const inOrder: Range = {
        low: small,
        high: large
      };
      const equalBound: Range = {
        low: large,
        high: large
      };
      const wrongOrder: Range = {
        low: large,
        high: small
      };
      expect(validateRange(inOrder)).toBe(true);
      expect(validateRange(equalBound)).toBe(true);
      expect(() => {
        validateRange(wrongOrder);
      }).toThrow(InvalidRangeValueError);
    });
    it('should require that both bounds have the same units', () => {
      const differentUnits: Range = {
        low: cloneDeep(small),
        high: large
      };
      differentUnits.low.unit = 'UCUM#kg';
      const missingUnit: Range = {
        low: small,
        high: cloneDeep(large)
      };
      delete missingUnit.high.unit;
      expect(() => {
        validateRange(differentUnits);
      }).toThrow(UnitMismatchError);
      expect(() => {
        validateRange(missingUnit);
      }).toThrow(UnitMismatchError);
    });
    it('should require that both bounds have the same code and system', () => {
      const differentCode: Range = {
        low: cloneDeep(small),
        high: large
      };
      differentCode.low.code = 'kg';
      const differentSystem: Range = {
        low: small,
        high: cloneDeep(large)
      };
      differentSystem.high.system = 'http://all.wrong';
      const missingCode: Range = {
        low: small,
        high: cloneDeep(large)
      };
      delete missingCode.high.code;
      const missingSystem: Range = {
        low: cloneDeep(small),
        high: large
      };
      delete missingSystem.low.system;
      expect(() => {
        validateRange(differentCode);
      }).toThrow(CodeAndSystemMismatchError);
      expect(() => {
        validateRange(differentSystem);
      }).toThrow(CodeAndSystemMismatchError);
      expect(() => {
        validateRange(missingCode);
      }).toThrow(CodeAndSystemMismatchError);
      expect(() => {
        validateRange(missingSystem);
      }).toThrow(CodeAndSystemMismatchError);
    });
  });
});
