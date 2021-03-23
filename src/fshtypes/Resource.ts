import { FshStructure } from './FshStructure';
import { AddElementRule, SdRule } from './rules';

export class Resource extends FshStructure {
  rules: (AddElementRule | SdRule)[];

  get constructorName() {
    return 'Resource';
  }
}
