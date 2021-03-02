import { Rule } from './Rule';

export class ContainsRule extends Rule {
  constructorName = 'ContainsRule';
  items: ContainsRuleItem[];

  constructor(path: string) {
    super(path);
    this.items = [];
  }
}

export type ContainsRuleItem = {
  name: string;
  type?: string;
};
