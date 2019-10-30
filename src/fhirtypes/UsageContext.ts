import { Coding } from './Coding';
import { CodeableConcept } from './CodeableConcept';
import { Quantity } from './Quantity';
import { Range } from './Range';

/**
 * Represents the FHIR R4 metadata type UsageContext.
 * The FHIR type's `value[x]` field can have many names and types,
 * not all of which are defined in this type.
 * valueCodeableConcept: CodeableConcept
 * valueQuantity: Quantity
 * valueRange: Range
 * valueReference: Reference<PlanDefinition, ResearchStudy, InsurancePlan, HealthcareService, Group, Location, Organization>
 *
 * @see {@link http://hl7.org/fhir/R4/metadatatypes.html#UsageContext}
 */
export type UsageContext = {
  code: Coding;
  valueCodeableConcept?: CodeableConcept;
  valueQuantity?: Quantity;
  valueRange?: Range;
};
