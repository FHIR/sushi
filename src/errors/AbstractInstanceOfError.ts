import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class AbstractInstanceOfError extends Error implements WithSource {
  constructor(
    public instanceName: string,
    public instanceOf: string,
    public sourceInfo: SourceInfo
  ) {
    super(
      `The definition for ${instanceName} is an instance of an abstract resource: ${instanceOf}`
    );
  }
}
