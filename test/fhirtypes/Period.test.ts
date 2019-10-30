import { Period, validatePeriod } from '../../src/fhirtypes/Identifier';
import { InvalidPeriodError } from '../../src/errors/InvalidPeriodError';

describe('Period', () => {
  let earlier: Date;
  let later: Date;

  beforeAll(() => {
    earlier = new Date();
    later = new Date();
    later.setFullYear(later.getFullYear() + 1);
  });

  describe('#validatePeriod', () => {
    it('should be valid when start and/or end are undefined', () => {
      const onlyStart: Period = {
        start: later
      };
      const onlyEnd: Period = {
        end: earlier
      };
      const timeless: Period = {};
      expect(validatePeriod(onlyStart)).toBe(true);
      expect(validatePeriod(onlyEnd)).toBe(true);
      expect(validatePeriod(timeless)).toBe(true);
    });
    it('should require start to be less than or equal to end', () => {
      const inOrder: Period = {
        start: earlier,
        end: later
      };
      const sameTime: Period = {
        start: earlier,
        end: earlier
      };
      const wrongOrder: Period = {
        start: later,
        end: earlier
      };
      expect(validatePeriod(inOrder)).toBe(true);
      expect(validatePeriod(sameTime)).toBe(true);
      expect(() => {
        validatePeriod(wrongOrder);
      }).toThrow(InvalidPeriodError);
    });
  });
});
