import { FixedValueRule } from './rules';

export class Instance {
  id: string;
  title?: string;
  instanceOf: string;
  rules: FixedValueRule[];

  constructor(public name: string) {
    this.id = name; // init same as name
    this.rules = [];
  }
}
