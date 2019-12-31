import { Annotated } from './Annotated';

export class DevPackageLoadError extends Error implements Annotated {
  specReferences = ['https://confluence.hl7.org/display/FHIR/NPM+Package+Specification'];
  constructor(public fullPackageName: string) {
    super(
      `The package ${fullPackageName} could not be loaded locally. Dev packages must be present in local cache`
    );
  }
}
