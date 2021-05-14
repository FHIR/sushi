import { FshStructure } from './FshStructure';
import { SdRule } from './rules';
import { EOL } from 'os';

export class Extension extends FshStructure {
  mixins?: string[];
  rules: SdRule[];

  constructor(public name: string) {
    super(name);
    // Init the parent to 'Extension', as this is what 99% of extensions do.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'Extension'; // init to 'Extension'
    this.mixins = [];
  }

  get constructorName() {
    return 'Extension';
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
