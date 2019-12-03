export class InvalidElementAccessError extends Error {
  constructor(public path: string) {
    super(
      `Cannot directly access differential or snapshot with path: ${path}. Elements should be targeted for modification by their path.`
    );
  }
}
