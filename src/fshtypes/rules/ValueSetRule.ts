import { Rule } from './Rule';

export class ValueSetRule extends Rule {
  valueSet: string;
  strength: string;

  constructor(path: string) {
    super(path);
  }
}
