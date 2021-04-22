import { FshStructure } from './FshStructure';
import { AddElementRule, SdRule } from './rules';

export class Logical extends FshStructure {
  rules: (AddElementRule | SdRule)[];

  constructor(public name: string) {
    super(name);
    // Init the parent to 'Base' based on https://chat.fhir.org/#narrow/pm-with/191469,210024,211704,239822-group/near/235378215.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'Base'; // init to 'Base'
  }

  get constructorName() {
    return 'Logical';
  }
}
