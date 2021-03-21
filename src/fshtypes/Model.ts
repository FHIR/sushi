import { FshEntity } from './FshEntity';
import { SdRule, AddElementRule } from './rules';

export abstract class Model extends FshEntity {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  rules: (SdRule | AddElementRule)[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }

  get constructorName() {
    return 'Model';
  }
}
