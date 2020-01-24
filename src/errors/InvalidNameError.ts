import { Annotated } from './Annotated';

export class InvalidNameError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/structuredefinition-definitions.html#StructureDefinition.name',
    'http://hl7.org/fhir/R4/valueset-definitions.html#ValueSet.name',
    'http://hl7.org/fhir/R4/codesystem-definitions.html#CodeSystem.name'
  ];
  constructor(public badName: string) {
    super(`The string "${badName}" does not represent a valid FHIR name.`);
  }
}
