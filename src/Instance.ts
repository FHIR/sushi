import { Rule } from './rules/Rule';

export class Instance {
  id: string;
  instanceOf: string;
  rules: Rule[];

  constructor(public name: string) {
    this.id = name; // init same as name
    this.rules = [];
  }
}
