import { Annotated } from './Annotated';

export class InvalidSumOfSliceMinsError extends Error implements Annotated {
  specReferences = ['http://www.hl7.org/fhir/profiling.html#slice-cardinality'];
  constructor(
    public sumMins: number,
    public max: string,
    public slicedElementId: string
  ) {
    super(
      `The sum of mins of slices must be <= max of sliced element, but sum of mins (${sumMins}) > max (${max}) of ${slicedElementId}.`
    );
  }
}
