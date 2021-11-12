export class InvalidElementForSlicingError extends Error {
  constructor(public path: string) {
    super(`Cannot slice element '${path}' which is not an array or choice`);
  }
}
