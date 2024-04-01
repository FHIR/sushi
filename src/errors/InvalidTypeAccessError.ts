export class InvalidTypeAccessError extends Error {
  constructor(public isLogical = false) {
    super(
      isLogical
        ? 'Can only directly change logical model type to a uri.'
        : 'Cannot directly change type. StructureDefinitions will naturally inherit their Parent type.'
    );
  }
}
