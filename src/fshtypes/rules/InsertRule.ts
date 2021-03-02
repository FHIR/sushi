import { Rule } from './Rule';

export class InsertRule extends Rule {
  constructorName = 'InsertRule';
  ruleSet: string;
  params: string[];

  constructor() {
    super('');
    this.params = [];
  }
}
