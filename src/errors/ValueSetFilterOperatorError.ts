import { Annotated } from './Annotated';

export class ValueSetFilterOperatorError extends Error implements Annotated {
  specReferences = ['https://www.hl7.org/fhir/valueset-filter-operator.html'];
  constructor(public value: string) {
    super(`Operator "${value}" not available in value set filter.`);
  }
}
