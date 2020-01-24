import { Annotated } from './Annotated';

export class InvalidIdError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes.html#id'];
  constructor(public badId: string) {
    super(`The string "${badId}" does not represent a valid FHIR id.`);
  }
}
