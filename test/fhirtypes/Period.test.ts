import { InvalidPeriodError } from '../../src/errors';
import { Period, validatePeriod } from '../../src/fhirtypes';

describe('Period', () => {
  let yearOnly: string;
  let yearMonth: string;
  let dateOnly: string;
  let hasTimeZone: string;
  let zTime: string;
  let zMilliseconds: string;

  beforeAll(() => {
    yearOnly = '1964';
    yearMonth = '1975-05';
    dateOnly = '2006-03-29';
    hasTimeZone = '2010-02-07T13:28:17+03:00';
    zTime = '2025-11-04T11:51:22Z';
    zMilliseconds = '2025-11-04T11:51:22.131Z';
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
