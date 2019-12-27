import { Annotated } from './Annotated';

export class CurrentPackageLoadError extends Error implements Annotated {
  specReferences = ['https://confluence.hl7.org/display/FHIR/NPM+Package+Specification'];
  constructor(public fullPackageName: string) {
    super(
      `The package ${fullPackageName} is not available on http://build.fhir.org/ig/qas.json, so no current version can be loaded`
    );
  }
}
