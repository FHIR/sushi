export class SliceTypeRemovalError extends Error {
  constructor(
    public rootPath: string,
    public sliceId: string
  ) {
    super(`Type constraint on ${rootPath} would eliminate all types on slice ${sliceId}`);
  }
}
