export class RequiredMetadataError extends Error {
  constructor(public field: string, public entityType: string, public entityName: string) {
    super(`Metadata field ${field} required when declaring ${entityType} ${entityName}.`);
  }
}
