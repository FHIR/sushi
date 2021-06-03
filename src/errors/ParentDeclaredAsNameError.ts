import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentDeclaredAsNameError extends Error implements WithSource {
  constructor(
    public type: string,
    public name: string,
    public sourceInfo: SourceInfo,
    public fhirResourceUrl: string
  ) {
    super(
      `${type} "${name}" cannot declare itself as a Parent. ${
        fhirResourceUrl
          ? `It looks like the parent is an external resource; use its URL (e.g., ${fhirResourceUrl}).`
          : ''
      }`
    );
  }
}
