import { FshEntity } from './FshEntity';
import { SdRule } from './rules';

export class Profile extends FshEntity {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  mixins?: string[];
  rules: SdRule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.mixins = [];
    this.rules = [];
  }
}
