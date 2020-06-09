export class InvalidAccessError extends Error {
  constructor() {
    super('Cannot directly change type. Elements will naturally inherit their Parent type.');
  }
}
