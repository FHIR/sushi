import { VsOperator } from '../fshtypes';

export class ValueSetFilterValueTypeError extends Error {
  constructor(
    public operator: VsOperator,
    public expectedType: 'string' | 'regex' | 'boolean' | 'code'
  ) {
    super(
      `Not applying value set filter: operator "${operator}" requires a ${expectedType} value.`
    );
  }
}
