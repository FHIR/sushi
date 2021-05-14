import { FshStructure } from './FshStructure';
import { SdRule } from './rules';
import { EOL } from 'os';

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

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
