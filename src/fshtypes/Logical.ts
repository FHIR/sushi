import { FshStructure } from './FshStructure';
import { LrRule } from './rules';
import { EOL } from 'os';

export class Logical extends FshStructure {
  rules: LrRule[];
  characteristics: LogicalCharacteristic[];

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

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}

// see https://hl7.org/fhir/extensions/ValueSet-type-characteristics-code.html
export type LogicalCharacteristic =
  | 'has-target'
  | 'has-range'
  | 'is-continuous'
  | 'has-length'
  | 'has-size'
  | 'can-bind'
  | 'has-units'
  | 'do-translations'
  | 'can-be-target';

export function isLogicalCharacteristic(s: string): s is LogicalCharacteristic {
  return (
    [
      'has-target',
      'has-range',
      'is-continuous',
      'has-length',
      'has-size',
      'can-bind',
      'has-units',
      'do-translations',
      'can-be-target'
    ].indexOf(s) >= 0
  );
}
