import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentDeclaredAsProfileNameError extends Error implements WithSource {
  constructor(public name: string, public sourceInfo: SourceInfo, public fhirResourceUrl: string) {
    super(
      `Profile "${name}" cannot declare itself as a Parent. ${
        fhirResourceUrl
          ? `It looks like the parent is an external resource; use its URL (e.g., ${fhirResourceUrl}).`
          : ''
      }`
    );
  }
}
