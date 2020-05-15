import { WithSource } from './WithSource';
import { SourceInfo } from '../fshtypes';

export class ParentDeclaredAsProfileIdError extends Error implements WithSource {
  constructor(
    public name: string,
    public id: string,
    public sourceInfo: SourceInfo,
    public fhirResourceUrl: string
  ) {
    super(
      `Profile "${name}" cannot declare "${id}" as both Parent and Id.${
        fhirResourceUrl
          ? ` It looks like the parent is an external resource; use its URL (e.g., ${fhirResourceUrl}).`
          : ''
      }`
    );
  }
}
