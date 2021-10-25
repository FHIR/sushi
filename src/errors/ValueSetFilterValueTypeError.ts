import { VsOperator } from '../fshtypes';

type expectedType = 'string' | 'regex' | 'boolean' | 'code';
export class ValueSetFilterValueTypeError extends Error {
  constructor(
    public operator: VsOperator,
    public expectedTypes: expectedType[],
    public allowedStrings: string[] = []
  ) {
    super(
      `Not applying value set filter: operator "${operator}" requires ${getExpectedTypes(
        expectedTypes,
        allowedStrings
      )}.`
    );
  }
}

function getExpectedTypes(types: expectedType[], allowedStrings: string[]): string {
  const formattedAllowedStrings = allowedStrings.map(s => `"${s}"`).join(' or ');
  const allowedStringsClause = formattedAllowedStrings
    ? ` or a string value of ${formattedAllowedStrings}`
    : '';
  return `a ${types.join(' or ')} value${allowedStringsClause}`;
}
