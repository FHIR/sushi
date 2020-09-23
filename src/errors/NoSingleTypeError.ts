import { Annotated } from './Annotated';

export class NoSingleTypeError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public type: string) {
    super(
      `Cannot assign ${type} value on this element since this element does not have a single type`
    );
  }
}
