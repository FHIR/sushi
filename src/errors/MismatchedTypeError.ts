import { Annotated } from './Annotated';
import { FixedValueType } from '../fshtypes/rules';

export class MismatchedTypeError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public valueType: string, public value: FixedValueType, public elementType: string) {
    super(
      `Cannot fix ${valueType} value ${value.toString()} on element of type ${elementType}; types do not match.`
    );
  }
}
