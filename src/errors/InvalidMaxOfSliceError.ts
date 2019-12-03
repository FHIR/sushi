import { Annotated } from './Annotated';

export class InvalidMaxOfSliceError extends Error implements Annotated {
  specReferences = ['http://www.hl7.org/fhir/profiling.html#slice-cardinality'];
  constructor(public sliceMax: string, public sliceName: string, public slicedElementMax: string) {
    super(
      `No individual slice may have max > max of sliced element, but max of slice ${sliceName} (${sliceMax}) > max of sliced element (${slicedElementMax}).`
    );
  }
}
