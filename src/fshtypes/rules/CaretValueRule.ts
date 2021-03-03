import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';

export class CaretValueRule extends Rule {
  caretPath: string;
  value: AssignmentValueType;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'CaretValueRule';
  }
}
