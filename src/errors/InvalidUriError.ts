export class InvalidUriError extends Error {
  constructor(public notUri: string) {
    super(`Resolved value "${notUri}" is not a valid URI.`);
  }
}
