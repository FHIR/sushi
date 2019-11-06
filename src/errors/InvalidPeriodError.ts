import { Annotated } from './Annotated';
import { Period } from '../fhirtypes/dataTypes';

export class InvalidPeriodError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes-definitions.html#Period'];
  constructor(public badPeriod: Period) {
    super(`The start ${badPeriod.start} cannot come before the end ${badPeriod.end}.`);
  }
}
