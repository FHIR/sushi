export class ValidationError extends Error {
  constructor(public issue: string, public fshPath: string) {
    super(`${fshPath}: ${issue}`);
  }
}
