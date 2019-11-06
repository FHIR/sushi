import { Annotated } from './Annotated';

export class InvalidDateTimeError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes.html#dateTime'];
  constructor(public nonDate: string) {
    super(`The string ${nonDate} does not represent a valid FHIR dateTime.`);
  }
}
