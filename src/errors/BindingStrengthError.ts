import { Annotated } from './Annotated';

export class BindingStrengthError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/terminologies.html#strength'];
  constructor(public foundStrength: string, public requestedStrength: string) {
    super(`Cannot override ${foundStrength} binding with ${requestedStrength} binding.`);
  }
}
