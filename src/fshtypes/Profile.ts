import { FshStructure } from './FshStructure';
import { SdRule } from './rules';

export class Profile extends FshStructure {
  mixins?: string[];
  rules: SdRule[];

  constructor(public name: string) {
    super(name);
    this.mixins = [];
  }

  get constructorName() {
    return 'Profile';
  }
}
