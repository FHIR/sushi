import { Rule } from './Rule';

export class BindingRule extends Rule {
  valueSet: string;
  strength: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'BindingRule';
  }
}
