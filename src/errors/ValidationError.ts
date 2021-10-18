export class ValidationError extends Error {
  constructor(public issue: string, public fhirPath: string) {
    super(`${fhirPath}: ${issue}`);
  }
}
