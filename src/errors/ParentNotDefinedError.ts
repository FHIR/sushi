import { Annotated } from './Annotated';

export class ParentNotDefinedError extends Error implements Annotated {
  specReferences = ['https://www.hl7.org/fhir/R4/profiling.html#resources'];
  constructor(public childName: string, public parentName: string) {
    super(`Parent ${parentName} not found for ${childName}`);
  }
}
