import { Rule } from './Rule';

export const TYPE_RULE_TYPE = 'type';

export class TypeRule implements Rule {
  ruleType: string;
  types: string[];
  only: boolean;

  constructor(public path: string) {
    this.ruleType = TYPE_RULE_TYPE;
    this.types = [];
  }
}
