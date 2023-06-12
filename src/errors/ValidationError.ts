export class ValidationError extends Error {
  constructor(public issue: string, public fshPath: string, public severity?: string) {
    super(`${fshPath}: ${issue}`);
  }
}
