import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';

export class CodeCaretValueRule extends Rule {
  caretPath: string;
  value: AssignmentValueType;
  isInstance: boolean;

  constructor(public readonly codePath: string[]) {
    super('');
  }

  get constructorName() {
    return 'CodeCaretValueRule';
  }
}
