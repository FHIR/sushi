import { Rule } from './Rule';
import { OnlyRuleType } from './OnlyRule';
import { typeString, fshifyString, HasFlags } from '../common';
import { applyMixins } from '../../utils/Mixin';

export class AddElementRule extends Rule {
  min: number;
  max: string;
  types: OnlyRuleType[] = [];
  // flags provided by HasFlags mixin
  short: string;
  definition?: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'AddElementRule';
  }

  toFSH(): string {
    const cardPart = `${this.min}..${this.max}`;
    const flagPart = this.flags.length ? ` ${this.flags.join(' ')}` : '';
    const typePart = typeString(this.types);
    const shortPart = this.short ? ` "${fshifyString(this.short)}"` : '';
    const definitionPart = this.definition ? ` "${fshifyString(this.definition)}"` : shortPart;
    return `* ${this.path} ${cardPart}${flagPart} ${typePart}${shortPart}${definitionPart}`;
  }
}

export interface AddElementRule extends Rule, HasFlags {}
applyMixins(AddElementRule, [HasFlags]);
