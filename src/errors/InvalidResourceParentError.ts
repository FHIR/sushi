import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidResourceParentError extends Error implements WithSource {
  constructor(
    public childName: string,
    public parentName: string,
    public sourceInfo: SourceInfo
  ) {
    super(
      `Invalid parent ${parentName} specified for resource ${childName}. The parent of a resource must be Resource or DomainResource.`
    );
  }
}
