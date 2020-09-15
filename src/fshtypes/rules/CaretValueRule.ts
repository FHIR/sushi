import { Rule } from './Rule';
import { FixedValueType } from './AssignmentRule';

export class CaretValueRule extends Rule {
  caretPath: string;
  value: FixedValueType;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }
}
