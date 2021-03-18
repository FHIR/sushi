import { Annotated } from './Annotated';
import { ElementDefinitionType } from '../fhirtypes';
import { isReferenceType } from '../fhirtypes/common';

export class InvalidTypeError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.type'
  ];
  constructor(public invalidType: string, public allowedTypes: ElementDefinitionType[]) {
    super(
      `The type "${invalidType}" does not match any of the allowed types: ${allowedTypesToString(
        allowedTypes
      )}`
    );
  }
}

/**
 * Represents allowed types as a string of choices.  Example outputs:
 * - Condition or Procedure
 * - http://example.org/fhir/StructureDefinition/SimpleProcedure
 * - Reference(Patient | Practitioner)
 * - Condition or http://example.org/fhir/StructureDefinition/SimpleProcedure or Reference(Patient | Practitioner)
 * @param types - the allowed types to serialize to a string
 */
function allowedTypesToString(types: ElementDefinitionType[]): string {
  if (types == null || types.length === 0) {
    return '<none>';
  }
  const strings: string[] = [];
  types.forEach(t => {
    if (isReferenceType(t.code)) {
      strings.push(`Reference(${(t.targetProfile ?? []).join(' | ')})`);
    } else if (t.profile?.length > 0) {
      strings.push(...t.profile);
    } else {
      strings.push(t.code);
    }
  });
  return strings.join(' or ');
}
