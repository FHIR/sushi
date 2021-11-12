import { Annotated } from '.';

export class InvalidElementForSlicingError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/elementdefinition-definitions.html#ElementDefinition.slicing'
  ];
  constructor(public path: string) {
    super(
      `Cannot slice element '${path}' since FHIR only allows slicing on choice elements (e.g., value[x]) or elements with max > 1`
    );
  }
}
