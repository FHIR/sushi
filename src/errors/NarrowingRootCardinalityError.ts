import { Annotated } from './Annotated';

export class NarrowingRootCardinalityError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#cardinality'];
  constructor(
    public rootElement: string,
    public existingSlice: string,
    public newMin: number,
    public newMax: string,
    public sliceMin: number,
    public sliceMax: string
  ) {
    super(
      `Cardinality on ${rootElement} cannot be narrowed to ${newMin}..${newMax} due to existing slice ${existingSlice} with cardinality ${sliceMin}..${sliceMax}.`
    );
  }
}
