import { FshStructure } from './FshStructure';
import { AddElementRule, SdRule } from './rules';
import { EOL } from 'os';

export class Resource extends FshStructure {
  rules: (AddElementRule | SdRule)[];

  get constructorName() {
    return 'Resource';
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
