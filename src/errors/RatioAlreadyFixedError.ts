import { Annotated } from './Annotated';
import { FshRatio } from '../fshtypes';

export class RatioAlreadyFixedError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public foundRatio: FshRatio, requestedRatio: FshRatio) {
    super(
      `Cannot fix ${requestedRatio.numerator?.value} ${requestedRatio.numerator?.unit?.code ??
        ''} : ${requestedRatio.denominator?.value} ${requestedRatio.denominator?.unit?.code ??
        ''} to this element; a different Ratio is already fixed: ${
        foundRatio.numerator?.value
      } ${foundRatio.numerator?.unit?.code ?? ''} : ${foundRatio.denominator?.value} ${foundRatio
        .denominator?.unit?.code ?? ''}.`
    );
  }
}
