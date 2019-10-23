import { Annotated } from './Annotated';

export class SlicingDefinitionError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#reslicing'];
  constructor(
    public property: string,
    public oldValue: boolean | string,
    public newValue: boolean | string
  ) {
    super(`Cannot constraint slicing property '${property}' from ${oldValue} to ${newValue}.`);
  }
}
