import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class AbstractProfileParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(`The definition for ${childName} has an abstract resource Parent: ${parentName}`);
  }
}
