import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';

export class CaretValueRule extends Rule {
  constructorName = 'CaretValueRule';
  caretPath: string;
  value: AssignmentValueType;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }
}
