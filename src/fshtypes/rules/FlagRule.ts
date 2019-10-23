import { Rule } from './Rule';

export const FLAG_RULE_TYPE = 'flag';

export class FlagRule implements Rule {
  ruleType: string;
  mustSupport: boolean;

  constructor(public path: string) {
    this.ruleType = FLAG_RULE_TYPE;
  }

  // TODO: IsModifier, IsSummary, and others
}
