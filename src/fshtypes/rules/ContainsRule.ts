import { Rule } from './Rule';

export class ContainsRule extends Rule {
  items: ContainsRuleItem[];

  constructor(path: string) {
    super(path);
    this.items = [];
  }

  get constructorName() {
    return 'ContainsRule';
  }
}

export type ContainsRuleItem = {
  name: string;
  type?: string;
};
