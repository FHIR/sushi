import { Annotated } from './Annotated';

export class FixedToPatternError extends Error implements Annotated {
  specReferences = [
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.fixed_x_',
    'http://hl7.org/fhir/R4/elementdefinition-definitions.html#ElementDefinition.pattern_x_'
  ];
  constructor(public fixedProperty: string) {
    super(
      'Cannot assign this element using a pattern; as it is already assigned in the StructureDefinition using ' +
        `${fixedProperty}. Since fixed[x] requires exact matches, while pattern[x] allows for variation in ` +
        'unspecified properties, fixed[x] cannot be replaced by pattern[x] since it would loosen the constraint.'
    );
  }
}
