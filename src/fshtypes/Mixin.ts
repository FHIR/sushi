import { FshEntity } from '.';
import { Rule } from './rules/Rule';

/**
 * The Mixin class is used to represent re-usable groups of rules
 */
export class Mixin extends FshEntity {
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.rules = [];
  }
}
