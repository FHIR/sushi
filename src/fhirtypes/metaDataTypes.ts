import { ContactPoint, CodeableConcept, Quantity, Coding, Reference } from './dataTypes';

/**
 * Represents the FHIR R4 metadata type ContactDetail.
 *
 * @see {@link http://hl7.org/fhir/R4/metadatatypes.html#ContactDetail}
 */
export type ContactDetail = {
  name?: string;
  telecom?: ContactPoint[];
};

/**
 * Represents the FHIR R4 metadata type UsageContext.
 * The FHIR type's `value[x]` field can have many names and types.
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
  valueReference?: Reference;
};
