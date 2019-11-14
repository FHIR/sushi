import { Annotated } from './Annotated';

export class DisableFlagError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.mustSupport',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.isModifier'
  ];
  constructor(public disabledFlags: string[]) {
    super(`Cannot disable these flags when they are enabled: ${disabledFlags.join(', ')}`);
  }
}
