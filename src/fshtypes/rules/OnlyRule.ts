import { Rule } from './Rule';
import { typeString } from '../common';

export class OnlyRule extends Rule {
  types: OnlyRuleType[] = [];

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'OnlyRule';
  }

  toFSH(): string {
    return `* ${this.path} only ${typeString(this.types)}`;
  }
}

export type OnlyRuleType = {
  type: string;
  isReference?: boolean;
  isCanonical?: boolean;
};
