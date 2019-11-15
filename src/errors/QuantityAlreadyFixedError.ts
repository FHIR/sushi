import { Annotated } from './Annotated';
import { FshQuantity } from '../fshtypes';

export class QuantityAlreadyFixedError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public foundQuantity: FshQuantity, requestedQuantity: FshQuantity) {
    super(
      `Cannot fix ${requestedQuantity.value} ${requestedQuantity.unit?.code ??
        ''} to this element; a different Quantity is already fixed: ${
        foundQuantity.value
      } ${foundQuantity.unit?.code ?? ''}.`
    );
  }
}
