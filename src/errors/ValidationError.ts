export class ValidationError extends Error {
  constructor(
    public issue: string,
    public fshPath: string,
    public severity: ErrorSeverity = 'error'
  ) {
    super(`${fshPath}: ${issue}`);
  }
}

type ErrorSeverity = 'error' | 'warn' | 'info';
