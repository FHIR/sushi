export class ValueSetFilterPropertyError extends Error {
  constructor(public value: string) {
    super(`Property "${value}" not available in value set filter.`);
  }
}
