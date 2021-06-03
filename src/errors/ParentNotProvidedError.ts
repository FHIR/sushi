import { Annotated } from './Annotated';
import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentNotProvidedError extends Error implements Annotated, WithSource {
  specReferences = ['https://www.hl7.org/fhir/R4/profiling.html#resources'];
  constructor(public defnName: string, public sourceInfo: SourceInfo) {
    super(`The definition for ${defnName} does not include a Parent`);
  }
}
