import { Annotated } from './Annotated';

export class ValueSetComposeError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/valueset-definitions.html#ValueSet.compose.include'];
  constructor(valueSetName: string) {
    super(`Non-empty ValueSet ${valueSetName} must be composed from at least one inclusion.`);
  }
}
