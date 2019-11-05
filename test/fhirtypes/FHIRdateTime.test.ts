import { FHIRdateTime, validateFHIRdateTime } from '../../src/fhirtypes';
import { InvalidDateTimeError } from '../../src/errors/InvalidDateTimeError';

describe('FHIRdateTime', () => {
  let yearOnly: FHIRdateTime;
  let yearMonth: FHIRdateTime;
  let dateOnly: FHIRdateTime;
  let hasTimeZone: FHIRdateTime;
  let zTime: FHIRdateTime;
  let noTimeZone: FHIRdateTime;

  beforeAll(() => {
    yearOnly = '1964';
    yearMonth = '1975-05';
    dateOnly = '2006-03-29';
    hasTimeZone = '2010-02-07T13:28:17+03:00';
    zTime = '2017-01-01T00:00:00.000Z';
    noTimeZone = '2010-02-07T13:28:17';
  });

  describe('#validateFHIRdateTime', () => {
    it('should allow just a year', () => {
      validateFHIRdateTime(yearOnly);
    });

    it('should allow a year and a month', () => {
      validateFHIRdateTime(yearMonth);
    });

    it('should allow a date without a time', () => {
      validateFHIRdateTime(dateOnly);
    });

    it('should allow a date and time with a time zone offset', () => {
      validateFHIRdateTime(hasTimeZone);
      validateFHIRdateTime(zTime);
    });

    it('should raise an error when given an empty string', () => {
      expect(() => {
        validateFHIRdateTime('');
      }).toThrow(InvalidDateTimeError);
    });

    it('should raise an error when the time zone offset is missing', () => {
      expect(() => {
        validateFHIRdateTime(noTimeZone);
      }).toThrow(InvalidDateTimeError);
    });
  });
});
