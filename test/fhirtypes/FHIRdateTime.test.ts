import { validateFHIRDateTime } from '../../src/fhirtypes';
import { InvalidDateTimeError } from '../../src/errors/InvalidDateTimeError';

describe('FHIRdateTime', () => {
  describe('#validateFHIRdateTime', () => {
    it('should allow just a year', () => {
      validateFHIRDateTime('1964');
    });

    it('should allow a year and a month', () => {
      validateFHIRDateTime('1975-05');
    });

    it('should allow a date without a time', () => {
      validateFHIRDateTime('2006-03-29');
    });

    it('should allow a date and time with a time zone offset', () => {
      validateFHIRDateTime('2010-02-07T13:28:17+03:00');
      validateFHIRDateTime('2017-01-01T00:00:00.000Z');
    });

    it('should throw an error when given an empty string', () => {
      expect(() => {
        validateFHIRDateTime('');
      }).toThrow(InvalidDateTimeError);
    });

    it('should raise an error when the time zone offset is missing', () => {
      expect(() => {
        validateFHIRDateTime('2010-02-07T13:28:17');
      }).toThrow(InvalidDateTimeError);
    });
  });
});
