import { Annotated } from './Annotated';

export class ClosedSlicingError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#reslicing'];
  constructor(
    public id: string,
    public sliceNames: string[]
  ) {
    super(
      `Cannot add ${sliceNames.join(', ')} to ${id} since its slicing was closed by a parent definition. New slices can only be added by the definition that closes the slicing.`
    );
  }
}
