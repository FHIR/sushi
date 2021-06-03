import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidLogicalParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(
      `Invalid parent ${parentName} specified for logical model ${childName}. The parent of a logical model must be Element, Base, another logical model, a resource, or a type.`
    );
  }
}
