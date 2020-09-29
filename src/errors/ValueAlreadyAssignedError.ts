import { Annotated } from './Annotated';

export class ValueAlreadyAssignedError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(
    public requestedValue: boolean | number | string,
    public elementType: string,
    public foundValue: boolean | number | string
  ) {
    super(
      `Cannot assign ${requestedValue} to this element; a different ${elementType} is already assigned: ${foundValue}.`
    );
  }
}
