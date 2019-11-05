import { Meta } from './specialTypes';

/**
 * Represents the FHIR R4 Resource element.
 *
 * @see {@link http://hl7.org/fhir/R4/resource.html#Resource}
 */
export type Resource = {
  id?: string;
  meta?: Meta;
  implicitRules?: string;
  language?: string;
};
