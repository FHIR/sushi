export class CannotResolvePathError extends Error {
  constructor(public path: string) {
    super(`The element or path you referenced does not exist: ${path}`);
  }
}
