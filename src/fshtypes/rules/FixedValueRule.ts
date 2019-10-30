import { Rule } from './Rule';
import { Code } from '../Code';

export const FIXED_VALUE_RULE_TYPE = 'fixedvalue';

export class FixedValueRule implements Rule {
  ruleType: string;
  fixedValue: boolean | number | string | Code;

  constructor(public path: string) {
    this.ruleType = FIXED_VALUE_RULE_TYPE;
  }
}
