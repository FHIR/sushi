export class MismatchedBindingTypeError extends Error {
  constructor(
    public id: string,
    public path: string,
    public correctedType: string
  ) {
    super(
      `Cannot ${
        correctedType === 'CodeSystem' ? 'assign' : 'bind'
      } ${id} at path ${path}. A ${correctedType} must be used.`
    );
  }
}
