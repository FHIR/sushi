export class DuplicateMetadataError extends Error {
  constructor(public field: string, public value: string) {
    super(`Metadata field ${field} already declared with value ${value}.`);
  }
}
