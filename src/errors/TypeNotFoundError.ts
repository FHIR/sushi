import { Annotated } from './Annotated';

export class TypeNotFoundError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.type'
  ];
  constructor(public unfoundType: string) {
    super(`No definition for the type "${unfoundType}" could be found.`);
  }
}
