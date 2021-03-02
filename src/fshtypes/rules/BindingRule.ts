import { Rule } from './Rule';

export class BindingRule extends Rule {
  constructorName = 'BindingRule';
  valueSet: string;
  strength: string;

  constructor(path: string) {
    super(path);
  }
}
