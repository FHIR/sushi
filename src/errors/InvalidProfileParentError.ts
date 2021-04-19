import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidProfileParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(`Parent ${parentName} is not a valid Parent for Profile ${childName}.`);
  }
}
