import { Annotated } from './Annotated';

export class InvalidResourceTypeError extends Error implements Annotated {
  specReferences = ['https://www.hl7.org/fhir/resourcelist.html'];
  constructor(public resourceType: string, public elementType: string) {
    super(`A resourceType of ${resourceType} cannot be set on an element of type ${elementType}.`);
  }
}
