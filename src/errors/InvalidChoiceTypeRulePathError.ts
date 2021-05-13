import { Annotated } from './Annotated';
import { Rule } from '../fshtypes/rules';

export class InvalidChoiceTypeRulePathError extends Error implements Annotated {
  specReferences = ['http://hl7.org/fhir/R4/formats.html#choice'];
  constructor(public rule: Rule) {
    super(
      `As a FHIR choice data type, the specified ${rule.path} for ${rule.constructorName} must end with '[x]'.`
    );
  }
}
