import { Annotated } from './Annotated';
import { AssignmentValueType } from '../fshtypes/rules';

export class MismatchedTypeError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(
    public valueType: string,
    public value: AssignmentValueType,
    public elementType: string
  ) {
    super(
      `Cannot fix ${valueType} value: ${value.toString()}. Value does not match element type: ${elementType}`
    );
  }
}
