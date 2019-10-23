import { Annotated } from './Annotated';

export class SlicingNotDefinedError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#slicing'];
  constructor(public id: string, public sliceName: string) {
    super(`Cannot create ${sliceName} slice. No slicing found for ${id}.`);
  }
}
