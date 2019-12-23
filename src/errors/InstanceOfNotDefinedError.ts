import { Annotated } from './Annotated';
import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InstanceOfNotDefinedError extends Error implements Annotated, WithSource {
  specReferences = [''];
  constructor(
    public instanceName: string,
    public instanceOf: string,
    public sourceInfo: SourceInfo
  ) {
    super(`InstanceOf ${instanceOf} not found for ${instanceName}`);
  }
}
