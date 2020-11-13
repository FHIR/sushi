import {
  InvalidRangeValueError,
  UnitMismatchError,
  CodeAndSystemMismatchError,
  InvalidPeriodError
} from '../errors';
import { FHIRDateTime, validateFHIRDateTime } from './primitiveTypes';
import { Meta } from './specialTypes';

/**
 * Represents the FHIR R4 data type BackboneElement.
 * This is the base definition for elements that have children defined
 * on a resource.
 *
 * @see {@link http://hl7.org/fhir/R4/backboneelement.html}
 */
export type BackboneElement = Element & {
  modifierExtension?: Extension[];
};

/**
 * Represents the FHIR R4 data type CodeableConcept.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#CodeableConcept}
 */
export type CodeableConcept = {
  coding?: Coding[];
  text?: string;
};

/**
 * Represents the FHIR R4 data type Coding.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Coding}
 */
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
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: Period;
};

/**
 * Represents the FHIR R4 data type Element.
 *
 * @see {@link http://hl7.org/fhir/R4/element.html}
 */
export type Element = {
  id?: string;
  extension?: Extension[];
};

/**
 * Represents the FHIR R4 data type Extension.
 * The FHIR type's `value[x]` field can have many names and types,
 * as listed on the accompanying page describing the FHIR type.
 *
 * @see {@link http://hl7.org/fhir/R4/extensibility.html#Extension}
 */
export type Extension = {
  url: string;
  [key: string]: any;
};

/**
 * Represents the FHIR R4 data type Identifier.
 * Instances of this type are used to uniquely identify
 * some other entity within a system.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Identifier}
 */
export type Identifier = {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: CodeableConcept;
  system?: string;
  value?: string;
  period?: Period;
  assigner?: Reference;
};

/**
 * Represents the FHIR R4 data type Narrative.
 *
 * @see {@link http://hl7.org/fhir/R4/narrative.html#Narrative}
 */
export type Narrative = {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string;
};

/**
 * Represents the FHIR R4 data type Period.
 * This type includes a constraint on the start and end values,
 * which are enforced in the following validatePeriod method.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Period}
 */
export type Period = {
  start?: FHIRDateTime;
  end?: FHIRDateTime;
};

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
    validateFHIRDateTime(period.start);
    start = new Date(period.start);
  }
  if (period.end) {
    validateFHIRDateTime(period.end);
    end = new Date(period.end);
  }
  if (start && end && start > end) {
    throw new InvalidPeriodError(period);
  }
}

/**
 * Represents the FHIR R4 data type Quantity.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Quantity}
 */
export type Quantity = {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
};

/**
 * Represents the FHIR R4 data type Ratio.
 *
 * @see {@link http://hl7.org/fhir/R4/datatypes.html#Ratio}
 */
export type Ratio = {
  numerator?: Quantity;
  denominator?: Quantity;
};

/**
 * Represents the FHIR R4 data type Range.
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

/**
 * Represents the FHIR R4 data type Reference.
 *
 * @see {@link http://hl7.org/fhir/R4/references.html#Reference}
 */
export type Reference = {
  reference?: string;
  type?: string;
  identifier?: Identifier;
  display?: string;
};

/**
 * Represents the FHIR R4 data type Resource.
 *
 * @see {@link http://hl7.org/fhir/R4/resource.html#Resource}
 */
export type Resource = {
  id?: string;
  meta?: Meta;
  implicitRules?: string;
  language?: string;
};

/**
 * Represents the FHIR R4 data type DomainResource.
 *
 * @see {@link http://hl7.org/fhir/R4/domainresource.html#resource}
 */
export type DomainResource = Resource & {
  text?: Narrative;
  contained?: any[];
  extension?: Extension[];
  modifierExtension?: Extension[];
};
