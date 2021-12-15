import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class InstanceOfLogicalProfileError extends Error implements WithSource {
  constructor(
    public instanceName: string,
    public instanceOf: string,
    public sourceInfo: SourceInfo
  ) {
    super(
      `Instance ${instanceName} cannot be created: InstanceOf ${instanceOf} represents a Profile of a logical model.`
    );
  }
}
