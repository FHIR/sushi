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

  get constructorName() {
    return 'RuleSet';
  }

  /**
   * Read only property for id that just returns the name of the mixin
   * This was added so that all types that are returned by FSHTank.fish have an id that can be accessed
   */
  get id() {
    return this.name;
  }
}
