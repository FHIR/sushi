import { Annotated } from './Annotated';

export class InvalidFHIRIdError extends Error implements Annotated {
  specReferences = ['https://www.hl7.org/fhir/datatypes.html#id'];
  constructor(public badId: string) {
    super(
      `The string "${badId}" does not represent a valid FHIR id. FHIR ids may contain any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.`
    );
  }
}
