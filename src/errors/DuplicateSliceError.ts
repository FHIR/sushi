export class DuplicateSliceError extends Error {
  constructor(structDef: string, element: string, slice: string) {
    super(`Slice named ${slice} already exists on element ${element} of ${structDef}`);
  }
}
