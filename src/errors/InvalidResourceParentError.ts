import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InvalidResourceParentError extends Error implements WithSource {
  constructor(public childName: string, public parentName: string, public sourceInfo: SourceInfo) {
    super(
      `Parent ${parentName} is not of type Resource or DomainResource, so it is an invalid Parent for Resource ${childName}.`
    );
  }
}
