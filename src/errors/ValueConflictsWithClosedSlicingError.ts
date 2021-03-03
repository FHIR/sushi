export class ValueConflictsWithClosedSlicingError extends Error {
  constructor(public requestedValue: boolean | number | string) {
    super(
      `Cannot assign ${requestedValue} to this element since it conflicts with all values of the closed slicing.`
    );
  }
}
