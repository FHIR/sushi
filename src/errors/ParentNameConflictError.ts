import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentNameConflictError extends Error implements WithSource {
  constructor(
    public childName: string,
    public parentName: string,
    public parentType: string,
    public sourceInfo: SourceInfo
  ) {
    super(
      `Parent ${parentName} for ${childName} is defined as ${
        /^[AEIOU]/.test(parentType) ? 'an' : 'a'
      } ${parentType} in FSH, which can't be used as a parent. A FHIR definition also exists with this name. If you intended to use that, reference it by its URL.`
    );
  }
}
