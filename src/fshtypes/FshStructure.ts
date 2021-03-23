import { FshEntity } from './FshEntity';
import { Rule } from './rules';

export abstract class FshStructure extends FshEntity {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }

  get constructorName() {
    return 'Model';
  }
}
