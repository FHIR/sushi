import { Rule } from './rules/Rule';

export class Extension {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  rules: Rule[];

  constructor(public name: string) {
    this.id = name; // init same as name
    this.parent = 'Extension'; // init to 'Extension'
    this.rules = [];
  }
}
