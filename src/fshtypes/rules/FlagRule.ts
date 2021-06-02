import { Rule } from './Rule';
import { HasFlags } from '../common';
import { applyMixins } from '../../utils/Mixin';

export class FlagRule extends Rule {
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

export interface FlagRule extends Rule, HasFlags {}
applyMixins(FlagRule, [HasFlags]);
