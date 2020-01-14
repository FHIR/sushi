import { Annotated } from './Annotated';

export class CodeSystemDuplicateCodeError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/codesystem.html#invs'];
  constructor(system: string, code: string) {
    super(`CodeSystem ${system} already contains code ${code}.`);
  }
}
