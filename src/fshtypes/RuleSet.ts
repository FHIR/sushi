import { FshEntity } from '.';
import { Rule } from './rules/Rule';

/**
 * The RuleSet class is used to represent re-usable groups of rules
 */
export class RuleSet extends FshEntity {
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.rules = [];
  }
}
