import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidExtensionParentError extends Error implements WithSource {
  constructor(
    public childName: string,
    public parentName: string,
    public sourceInfo: SourceInfo
  ) {
    super(
      `Invalid parent ${parentName} specified for extension ${childName}. The parent of an extension must be the base Extension or another defined extension.`
    );
  }
}
