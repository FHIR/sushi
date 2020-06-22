import { Rule } from './Rule';

export class InsertRule extends Rule {
  ruleSets: string[];

  constructor() {
    super('');
    this.ruleSets = [];
  }
}
