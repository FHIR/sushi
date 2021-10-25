import { VsOperator } from '../fshtypes';

type expectedType = 'string' | 'regex' | 'boolean' | 'code';
export class ValueSetFilterValueTypeError extends Error {
  constructor(public operator: VsOperator, public expectedType: expectedType[]) {
    super(
      `Not applying value set filter: operator "${operator}" requires a ${expectedType.join(
        ' or '
      )} value.`
    );
  }
}
