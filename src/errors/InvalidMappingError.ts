import { Annotated } from './Annotated';

export class InvalidMappingError extends Error implements Annotated {
  specReferences = [
    'https://www.hl7.org/fhir/elementdefinition-definitions.html#ElementDefinition.mapping'
  ];
  constructor() {
    super('Invalid mapping, mapping.identity and mapping.map are 1..1 and must be set.');
  }
}
