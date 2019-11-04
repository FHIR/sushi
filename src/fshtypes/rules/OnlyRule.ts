import { Rule } from './Rule';

export class OnlyRule extends Rule {
  types: string[] = [];

  constructor(path: string) {
    super(path);
  }
}
