import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidLogicalParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(
      `Parent ${parentName} is not of type Logical or Resource or Element or Base, so it is an invalid Parent for Logical ${childName}.`
    );
  }
}
