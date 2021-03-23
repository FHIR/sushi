import { FshStructure } from './FshStructure';
import { AddElementRule, SdRule } from './rules';

export class Logical extends FshStructure {
  rules: (AddElementRule | SdRule)[];

  get constructorName() {
    return 'Logical';
  }
}
