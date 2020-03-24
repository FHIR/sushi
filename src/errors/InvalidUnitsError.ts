export class InvalidUnitsError extends Error {
  constructor(public id: string) {
    super(`Invalid use of "units" keyword on non-Quantity element: ${id}`);
  }
}
