import { Rule } from './Rule';

export const FLAG_RULE_TYPE = 'flag';

export class FlagRule implements Rule {
  readonly ruleType: string;
  mustSupport: boolean;
  summary: boolean;
  modifier: boolean;

  constructor(public path: string) {
    this.ruleType = FLAG_RULE_TYPE;
  }
}
