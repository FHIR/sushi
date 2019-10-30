import { Rule } from './Rule';

export const ONLY_RULE_TYPE = 'only';

export class OnlyRule implements Rule {
  readonly ruleType: string;
  types: string[];

  constructor(public path: string) {
    this.ruleType = ONLY_RULE_TYPE;
    this.types = [];
  }
}
