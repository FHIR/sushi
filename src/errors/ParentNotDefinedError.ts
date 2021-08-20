import { Annotated } from './Annotated';
import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentNotDefinedError extends Error implements Annotated, WithSource {
  specReferences = ['https://www.hl7.org/fhir/R4/profiling.html#resources'];
  constructor(
    public childName: string,
    public parentName: string,
    public sourceInfo: SourceInfo,
    public conflict?: boolean
  ) {
    super(
      `Parent ${parentName} not found for ${childName}${
        conflict ? ' - Do you have conflicting names in your definitions?' : ''
      }`
    );
  }
}
