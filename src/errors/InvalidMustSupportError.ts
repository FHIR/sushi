import { Annotated } from './Annotated';

export class InvalidMustSupportError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/profiling.html#mustsupport'];
  constructor(structDef: string, element: string) {
    super(
      `The MustSupport flag is not permitted on element ${element} of ${structDef} (allowed only in Profiles).`
    );
  }
}
