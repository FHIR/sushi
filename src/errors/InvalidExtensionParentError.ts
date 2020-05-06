import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidExtensionParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(
      `Parent ${parentName} is not of type Extension, so it is an invalid Parent for Extension ${childName}.`
    );
  }
}
