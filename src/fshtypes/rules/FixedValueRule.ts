import { Rule } from './Rule';
import { Code, Quantity, Ratio } from '../index';

export const FIXED_VALUE_RULE_TYPE = 'fixedvalue';

export class FixedValueRule implements Rule {
  readonly ruleType: string;
  fixedValue: boolean | number | string | Code | Quantity | Ratio;

  constructor(public path: string) {
    this.ruleType = FIXED_VALUE_RULE_TYPE;
  }
}
