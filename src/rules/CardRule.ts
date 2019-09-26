import { Rule } from './Rule';

export const CARD_RULE_TYPE = 'card';

export class CardRule implements Rule {
  ruleType: string;
  min: number;
  max: string;

  constructor(public path: string) {
    this.ruleType = CARD_RULE_TYPE;
  }
}
