import { InvalidDateTimeError } from '../errors';

/**
 * Represents the FHIR primitive type dateTime.
 * A dateTime may be a year, a year and a month, a year-month-day, or a full date and time.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#dateTime}
 */
export type FHIRDateTime = string;

const dateTimeRegex =
  /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/;

export function validateFHIRDateTime(dateTime: FHIRDateTime): void {
  if (!dateTimeRegex.test(dateTime)) {
    throw new InvalidDateTimeError(dateTime);
  }
}

/**
 * Represents the FHIR primitive type id.
 * An id is a string between 1 and 64 characters long and contains only uppercase letter,
 * lowercase letter, numeral, '-', and '.' characters.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#id}
 */
export type FHIRId = string;

export const idRegex = /^[A-Za-z0-9\-\.]{1,64}$/;
