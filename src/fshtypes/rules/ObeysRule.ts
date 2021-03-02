import { Rule } from './Rule';

export class ObeysRule extends Rule {
  invariant: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'ObeysRule';
  }
}
