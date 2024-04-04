export class InvalidTypeAccessError extends Error {
  constructor() {
    super(
      'Cannot directly change type. StructureDefinitions will naturally inherit their Parent type.'
    );
  }
}
