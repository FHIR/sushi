import { Rule } from './Rule';

export const VALUE_SET_RULE_TYPE = 'valueset';

export class ValueSetRule implements Rule {
  ruleType: string;
  valueSet: string;
  strength: string;

  constructor(public path: string) {
    this.ruleType = VALUE_SET_RULE_TYPE;
  }
}
