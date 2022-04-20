export class MissingInitializeFunctionError extends Error {
  constructor() {
    super('Plugin does not provide an "initialize" function.');
  }
}
