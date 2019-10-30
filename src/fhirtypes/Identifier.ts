import { CodeableConcept } from './CodeableConcept';
import { InvalidPeriodError } from '../errors/InvalidPeriodError';

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
  start?: Date;
  end?: Date;
};

/**
 * Enforces the constraint on Period instances that the start
 * cannot come after the end.
 * @param period - the Period to validate.
 * @returns {boolean} - true when the Period is valid.
 * @throws {InvalidPeriodError} when the start comes before the end.
 */

export function validatePeriod(period: Period): boolean {
  if (period.start > period.end) {
    throw new InvalidPeriodError(period.start, period.end);
  }
  return true;
}
