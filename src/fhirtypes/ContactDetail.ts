import { Period } from './Identifier';

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
