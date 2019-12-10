import { Annotated } from './Annotated';

export class InvalidExtensionSliceError extends Error implements Annotated {
  specReferences = ['http://www.hl7.org/fhiR/profiling.html#slicing'];
  constructor(public sliceName: string) {
    super(
      `The slice ${sliceName} on extension must reference an existing extension, or fix a url if the extension is defined inline.`
    );
  }
}
