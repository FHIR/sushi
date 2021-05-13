import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidProfileParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(
      `Invalid parent ${parentName} specified for profile ${childName}. The parent of a profile must be a resource or another profile.`
    );
  }
}
