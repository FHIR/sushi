export class CannotResolvePathError extends Error {
  constructor(public path: string) {
    super(`Cannot resolve path ${path} to an element`);
  }
}
