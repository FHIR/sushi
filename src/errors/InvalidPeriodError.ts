import { Annotated } from './Annotated';

export class InvalidPeriodError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes-definitions.html#Period'];
  constructor(public start: Date, public end: Date) {
    super(`The start ${start} cannot come before the end ${end}.`);
  }
}
