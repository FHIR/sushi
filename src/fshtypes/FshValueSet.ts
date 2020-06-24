import { FshEntity } from './FshEntity';
import { ValueSetComponent } from './ValueSetComponent';
import { CaretValueRule, InsertRule, Rule } from './rules';

/**
 * For more information about the composition of a ValueSet,
 * @see {@link http://hl7.org/fhir/valueset-definitions.html#ValueSet.compose}
 */
export class FshValueSet extends FshEntity {
  id: string;
  title?: string;
  description?: string;
  rules: (ValueSetComponent | CaretValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.rules = [];
  }

  ruleIsAllowed(rule: Rule) {
    return rule instanceof ValueSetComponent || rule instanceof CaretValueRule;
  }
}
