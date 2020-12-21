import { Rule } from './Rule';

export class InsertRule extends Rule {
  ruleSet: string;
  params: string[];

  constructor() {
    super('');
    this.params = [];
  }
}
