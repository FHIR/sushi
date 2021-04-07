import { Rule } from './Rule';
import { OnlyRuleType } from './OnlyRule';
import { typeString, fshifyString, HasFlags } from '../common';
import { applyMixins } from '../../utils/Mixin';

export class AddElementRule extends Rule {
  min: number;
  max: string;
  types: OnlyRuleType[] = [];
  // flags provided by HasFlags mixin
  short?: string;
  definition?: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'AddElementRule';
  }

  get flags(): string[] {
    const flags: string[] = [];
    if (this.mustSupport) flags.push('MS');
    if (this.modifier) flags.push('?!');
    if (this.summary) flags.push('SU');
    if (this.draft) flags.push('D');
    else if (this.trialUse) flags.push('TU');
    else if (this.normative) flags.push('N');

    return flags;
  }

  toFSH(): string {
    const cardPart = `${this.min}..${this.max}`;
    const flagPart = this.flags.length ? ` ${this.flags.join(' ')}` : '';
    const typePart = typeString(this.types);
    const shortPart = this.short ? ` "${fshifyString(this.short)}"` : '';
    const definitionPart = this.definition ? ` "${fshifyString(this.definition)}"` : '';
    return `* ${this.path} ${cardPart}${flagPart} ${typePart}${shortPart}${definitionPart}`;
  }
}

export interface AddElementRule extends Rule, HasFlags {}
applyMixins(AddElementRule, [HasFlags]);
