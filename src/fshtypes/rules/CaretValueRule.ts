import { Rule } from './Rule';
import { FixedValueType } from './FixedValueRule';

export class CaretValueRule extends Rule {
  caretPath: string;
  value: FixedValueType;

  constructor(path: string) {
    super(path);
  }
}
