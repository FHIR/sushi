import { Rule } from './rules/Rule';
import { FshEntity } from './FshEntity';

export class Instance extends FshEntity {
  id: string;
  instanceOf: string;
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }
}
