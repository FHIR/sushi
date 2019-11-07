import { Rule } from './rules/Rule';

export class Profile {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  rules: Rule[];

  constructor(
    public name: string,
    public startLine?: number,
    public startColumn?: number,
    public endLine?: number,
    public endColumn?: number
  ) {
    this.id = name; // init same as name
    this.rules = [];
  }
}
