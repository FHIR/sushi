import { FixedValueRule } from './rules';
import { FshEntity } from './FshEntity';

export class Instance extends FshEntity {
  id: string;
  title?: string;
  instanceOf: string;
  rules: FixedValueRule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }
}
