import { FshStructure } from './FshStructure';
import { LrRule } from './rules';
import { EOL } from 'os';

export class Logical extends FshStructure {
  rules: LrRule[];
  characteristics: string[];

  constructor(public name: string) {
    super(name);
    // Init the parent to 'Base' based on https://chat.fhir.org/#narrow/pm-with/191469,210024,211704,239822-group/near/235378215.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'Base'; // init to 'Base'
    this.characteristics = [];
  }

  get constructorName() {
    return 'Logical';
  }

  metadataToFSH(): string {
    const sdMetadata = super.metadataToFSH();
    if (this.characteristics.length) {
      const characteristicsFsh = this.characteristics
        .map(characteristic => `#${characteristic}`)
        .join(', ');
      return `${sdMetadata}${EOL}Characteristics: ${characteristicsFsh}`;
    } else {
      return sdMetadata;
    }
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
