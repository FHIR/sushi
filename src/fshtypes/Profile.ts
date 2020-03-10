import { Rule } from './rules/Rule';
import { FshEntity } from './FshEntity';

export class Profile extends FshEntity {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  mixins?: string[];
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.mixins = [];
    this.rules = [];
  }
}
