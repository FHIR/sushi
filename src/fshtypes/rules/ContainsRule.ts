import { Rule } from './Rule';

export class ContainsRule extends Rule {
  sliceNames: string[];

  constructor(path: string) {
    super(path);
    this.sliceNames = [];
  }
}
