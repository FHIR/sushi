import { Rule } from './Rule';

export class ValueSetRule extends Rule {
  valueSet: string;
  strength: string;
  units: boolean;

  constructor(path: string) {
    super(path);
  }
}
