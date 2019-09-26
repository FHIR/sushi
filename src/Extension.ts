import { Rule } from './rules/Rule';

export class Extension {
  id: string;
  parent?: string;
  rules: Rule[];

  constructor(public name: string) {
    this.id = name; // init same as name
    this.rules = [];
  }
}
