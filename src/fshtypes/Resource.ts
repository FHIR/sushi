import { FshStructure } from './FshStructure';
import { AddElementRule, SdRule } from './rules';

export class Resource extends FshStructure {
  rules: (AddElementRule | SdRule)[];

  constructor(public name: string) {
    super(name);
    // Init the parent to 'DomainResource', as this is what 99% of resources do.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'DomainResource'; // init to 'DomainResource'
  }

  get constructorName() {
    return 'Resource';
  }
}
