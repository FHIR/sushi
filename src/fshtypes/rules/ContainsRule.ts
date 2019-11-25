import { Rule } from './Rule';

export class ContainsRule extends Rule {
  items: string[];

  constructor(path: string) {
    super(path);
    this.items = [];
  }
}
