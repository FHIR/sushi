import { Annotated } from './Annotated';

export class InvalidRangeValueError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/datatypes-definitions.html#Range'];
  constructor(public low: number, public high: number) {
    super(`The low must be <= high, but low ${low} is > high ${high}.`);
  }
}
