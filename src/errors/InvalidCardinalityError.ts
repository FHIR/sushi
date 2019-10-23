import { Annotated } from './Annotated';

export class InvalidCardinalityError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.min'
  ];
  constructor(public min: number, public max: string) {
    super(`The min must be <= max, but min ${min} is > max ${max}.`);
  }
}
