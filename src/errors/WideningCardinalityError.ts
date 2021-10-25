import { Annotated } from './Annotated';

export class WideningCardinalityError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#cardinality'];
  constructor(
    public originalMin: number,
    public originalMax: string,
    public newMin: number,
    public newMax: string
  ) {
    super(
      `Cannot constrain cardinality to ${newMin}..${newMax}, as it does not fit within the original ${originalMin}..${originalMax} cardinality.`
    );
  }
}
