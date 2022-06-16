export class ElementAreadyDefinedError extends Error {
  constructor(public elementID: string) {
    super(`Cannot define element ${elementID} because it has already been defined`);
  }
}
