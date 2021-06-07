import { FlagCarryingRule } from './FlagCarryingRule';

export class FlagRule extends FlagCarryingRule {
  // flags provided by HasFlags mixin

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'FlagRule';
  }

  flagsToString(): string {
    return this.flags.join(' ');
  }

  toFSH(): string {
    return `* ${this.path} ${this.flagsToString()}`;
  }
}
