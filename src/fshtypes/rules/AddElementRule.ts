import { OnlyRuleType } from './OnlyRule';
import { FlagCarryingRule } from './FlagCarryingRule';
import { typeString, fshifyString } from '../common';

export class AddElementRule extends FlagCarryingRule {
  min: number;
  max: string;
  types: OnlyRuleType[] = [];
  contentReference?: string;
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
    const shortPart = this.short ? ` "${fshifyString(this.short)}"` : '';
    const definitionPart = this.definition ? ` "${fshifyString(this.definition)}"` : shortPart;
    if (this.types.length > 0) {
      const typePart = typeString(this.types);
      return `* ${this.path} ${cardPart}${flagPart} ${typePart}${shortPart}${definitionPart}`;
    } else {
      return `* ${this.path} contentReference ${this.contentReference} ${cardPart}${flagPart}${shortPart}${definitionPart}`;
    }
  }
}
