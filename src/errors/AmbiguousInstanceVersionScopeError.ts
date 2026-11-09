import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class AmbiguousInstanceVersionScopeError extends Error implements WithSource {
  constructor(
    public instanceName: string,
    public instanceId: string,
    public instanceOf: string,
    reason: string,
    interpretations: string[],
    public sourceInfo: SourceInfo
  ) {
    super(
      `Cannot determine a safe version scope for instance ${instanceName} (id: ${instanceId}, InstanceOf: ${instanceOf}). ` +
        `${reason}\n  ${interpretations.join('\n  ')}\n` +
        'Align InstanceOf and the inclusion parameters. Use unambiguous Type/id or explicit-URL ' +
        'entries where appropriate, or distinct ids when the resource type cannot otherwise be determined.'
    );
  }
}
