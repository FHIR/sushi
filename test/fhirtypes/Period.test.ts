import { InvalidPeriodError } from '../../src/errors';
import { Period, validatePeriod } from '../../src/fhirtypes';

describe('Period', () => {
  let dateOnly: string;
  let hasTimeZone: string;

  beforeAll(() => {
    dateOnly = '2006-03-29';
    hasTimeZone = '2010-02-07T13:28:17+03:00';
  });

  describe('#validatePeriod', () => {
    it('should be valid when start and/or end are undefined', () => {
      const onlyStart: Period = {
        start: dateOnly
      };
      const onlyEnd: Period = {
        end: hasTimeZone
      };
      const timeless: Period = {};
      validatePeriod(onlyStart);
      validatePeriod(onlyEnd);
      validatePeriod(timeless);
    });
    it('should require start to be less than or equal to end', () => {
      const inOrder: Period = {
        start: dateOnly,
        end: hasTimeZone
      };
      const sameTime: Period = {
        start: dateOnly,
        end: dateOnly
      };
      const wrongOrder: Period = {
        start: hasTimeZone,
        end: dateOnly
      };
      validatePeriod(inOrder);
      validatePeriod(sameTime);
      expect(() => {
        validatePeriod(wrongOrder);
      }).toThrow(InvalidPeriodError);
    });
  });
});
