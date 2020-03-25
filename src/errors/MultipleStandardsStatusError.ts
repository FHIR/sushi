import { Annotated } from './Annotated';

export class MultipleStandardsStatusError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/extension-structuredefinition-standards-status.html'];
  constructor(public element: string) {
    super(`Cannot apply multiple standards status on ${element}`);
  }
}
