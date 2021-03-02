import { Rule } from './Rule';

export class ObeysRule extends Rule {
  constructorName = 'ObeysRule';
  invariant: string;

  constructor(path: string) {
    super(path);
  }
}
