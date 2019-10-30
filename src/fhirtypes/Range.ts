import { Quantity } from './Quantity';
import { InvalidRangeValueError } from '../errors/InvalidRangeValueError';
import { UnitMismatchError } from '../errors/UnitMismatchError';
import { CodeAndSystemMismatchError } from '../errors/CodeAndSystemMismatchError';

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
 * @returns {boolean} - true when the Range is valid.
 * @throws {InvalidRangeValueError} when the low value is greater than or equal to the high value.
 * @throws {UnitMismatchError} when low and high do not have matching unit attributes.
 * @throws {CodeAndSystemMismatchError} when low and high do not have matching code and system attributes.
 */
export function validateRange(range: Range): boolean {
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
  return true;
}
