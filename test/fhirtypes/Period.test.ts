import { InvalidPeriodError } from '../../src/errors';
import { Period, validatePeriod, FHIRDateTime } from '../../src/fhirtypes';

describe('Period', () => {
  let earlier: FHIRDateTime;
  let later: FHIRDateTime;

  beforeAll(() => {
    earlier = '2001-11-23';
    later = '2002-01-07';
  });

  describe('#validatePeriod', () => {
    it('should be valid when start and/or end are undefined', () => {
      const onlyStart: Period = {
        start: '2006-03-29'
      };
      const onlyEnd: Period = {
        end: '2010-02-07T13:28:17+03:00'
      };
      const timeless: Period = {};
      validatePeriod(onlyStart);
      validatePeriod(onlyEnd);
      validatePeriod(timeless);
    });

    it('should be valid when start is less than or equal to end', () => {
      const inOrder: Period = {
        start: earlier,
        end: later
      };
      const sameTime: Period = {
        start: earlier,
        end: earlier
      };
      validatePeriod(inOrder);
      validatePeriod(sameTime);
    });

    it('should throw an error when start is greater than end', () => {
      const wrongOrder: Period = {
        start: later,
        end: earlier
      };
      expect(() => {
        validatePeriod(wrongOrder);
      }).toThrow(InvalidPeriodError);
    });
  });
});
