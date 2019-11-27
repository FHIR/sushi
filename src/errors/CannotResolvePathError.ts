export class CannotResolvePathError extends Error {
  constructor(public path: string) {
    super(`Cannot resolve element from path: ${path}`);
  }
}
