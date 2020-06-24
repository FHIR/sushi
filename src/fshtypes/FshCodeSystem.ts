import { FshEntity } from './FshEntity';
import { CodeSystemDuplicateCodeError } from '../errors/CodeSystemDuplicateCodeError';
import { CaretValueRule, InsertRule, Rule, ConceptRule } from './rules';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class FshCodeSystem extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  rules: (ConceptRule | CaretValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.rules = [];
  }

  addConcept(newConcept: ConceptRule) {
    if (
      this.rules
        .filter(rule => rule instanceof ConceptRule)
        .find((existingConcept: ConceptRule) => existingConcept.code == newConcept.code)
    ) {
      throw new CodeSystemDuplicateCodeError(this.id, newConcept.code);
    }
    this.rules.push(newConcept);
  }

  ruleIsAllowed(rule: Rule) {
    return rule instanceof ConceptRule || rule instanceof CaretValueRule;
  }
}
