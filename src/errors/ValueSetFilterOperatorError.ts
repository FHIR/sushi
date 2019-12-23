export class ValueSetFilterOperatorError extends Error {
  constructor(public value: string) {
    super(`Operator "${value}" not available in value set filter.`);
  }
}
