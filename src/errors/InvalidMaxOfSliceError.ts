import { Annotated } from './Annotated';

export class InvalidMaxOfSliceError extends Error implements Annotated {
  specReferences = ['http://www.hl7.org/fhiR/profiling.html#slice-cardinality'];
  constructor(public sliceMax: string, public sliceName: string, public slicedElementMax: string) {
    super(
      `No individual slice may have max >= max of sliced element, but max ${sliceMax} of slice ${sliceName} > max of sliced element ${slicedElementMax}.`
    );
  }
}
