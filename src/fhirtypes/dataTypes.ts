import { InvalidRangeValueError } from '../errors/InvalidRangeValueError';
import { UnitMismatchError } from '../errors/UnitMismatchError';
import { CodeAndSystemMismatchError } from '../errors/CodeAndSystemMismatchError';
import { InvalidPeriodError } from '../errors/InvalidPeriodError';
import { FHIRdateTime, validateFHIRdateTime } from './primitiveTypes';

export type CodeableConcept = {
  coding?: Coding[];
  text?: string;
};

export type Coding = {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
};

/**
 * Represents the FHIR R4 data type ContactPoint.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#ContactPoint}
 */
export type ContactPoint = {
  system?: string;
  value?: string;
  use?: string;
  rank?: number;
  period?: Period;
};

/**
 * Represents the FHIR R4 data type Identifier.
 * Instances of this type are used to uniquely identify
 * some other entity within a system.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Identifier}
 */
export type Identifier = {
  use?: string;
  type?: CodeableConcept;
  system?: string;
  value?: string;
  period?: Period;
  assigner?: any;
};

/**
 * Represents the FHIR R4 data type Period.
 * This type includes a constraint on the start and end values,
 * which are enforced in the following validatePeriod method.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Period}
 */
export type Period = {
  start?: FHIRdateTime;
  end?: FHIRdateTime;
};

// http://hl7.org/fhir/R4/datatypes.html#dateTime

/**
 * Throws an error if either start or end are not valid dateTime strings,
 * or if the start comes before the end.
 * @param period - the Period to validate.
 * @returns {void}
 * @throws {InvalidPeriodError} when the start comes before the end.
 */

export function validatePeriod(period: Period): void {
  let start: Date, end: Date;
  if (period.start) {
    validateFHIRdateTime(period.start);
    start = new Date(period.start);
  }
  if (period.end) {
    validateFHIRdateTime(period.end);
    end = new Date(period.end);
  }
  if (start && end && start > end) {
    throw new InvalidPeriodError(period);
  }
}

export type Quantity = {
  value?: number;
  comparator?: string;
  unit?: string;
  system?: string;
  code?: string;
};

/**
 * Represents a FHIR R4 Range.
 * The FHIR type definition includes constraints,
 * which are enforced in the following validateRange method.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Range}
 */
export type Range = {
  low?: Quantity;
  high?: Quantity;
};

/**
 * Enforces constraints on values, units, codes, and systems in a range.
 * @param {range} Range - the Range to validate.
 * @returns {void}
 * @throws {InvalidRangeValueError} when the low value is greater than or equal to the high value.
 * @throws {UnitMismatchError} when low and high do not have matching unit attributes.
 * @throws {CodeAndSystemMismatchError} when low and high do not have matching code and system attributes.
 */
export function validateRange(range: Range): void {
  if (range.low && range.high) {
    if (range.low.value > range.high.value) {
      throw new InvalidRangeValueError(range.low.value, range.high.value);
    }
    if (range.low.unit !== range.high.unit) {
      throw new UnitMismatchError(range.low, range.high);
    }
    if (range.low.code !== range.high.code || range.low.system !== range.high.system) {
      throw new CodeAndSystemMismatchError(range.low, range.high);
    }
  }
}
