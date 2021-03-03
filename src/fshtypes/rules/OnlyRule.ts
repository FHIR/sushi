import { Rule } from './Rule';

export class OnlyRule extends Rule {
  types: OnlyRuleType[] = [];

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'OnlyRule';
  }
}

export type OnlyRuleType = {
  type: string;
  isReference?: boolean;
};
