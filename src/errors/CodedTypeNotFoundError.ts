import { Annotated } from './Annotated';

export class CodedTypeNotFoundError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.binding'
  ];
  constructor(public foundTypes: string[]) {
    super(
      `Cannot bind value set to ${foundTypes.join(
        ','
      )}; must be coded (code, Coding, CodeableConcept, Quantity, CodeableReference), the data types (string, uri), or a logical model with the #can-bind characteristic.`
    );
  }
}
