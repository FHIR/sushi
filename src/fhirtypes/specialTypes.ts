import { Coding } from './dataTypes';

/**
 * Type to represent FHIR R4 resource metadata.
 * Of note is the `profile` field, where each list element is a canonical reference to the StructureDefinitions
 * that this resource claims to conform to.
 *
 * @see {@link http://hl7.org/fhir/R4/resource.html#Meta}
 */
export type Meta = {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: Coding[];
  tag?: Coding[];
};
