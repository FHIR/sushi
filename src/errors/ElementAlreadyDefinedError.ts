export class ElementAlreadyDefinedError extends Error {
  constructor(
    public elementId: string,
    public definitionId: string
  ) {
    super(
      `Cannot define element ${elementId} on ${definitionId} because it has already been defined`
    );
  }
}
