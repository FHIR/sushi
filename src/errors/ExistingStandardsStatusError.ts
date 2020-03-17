export class ExistingStandardsStatusError extends Error {
  constructor(public element: string) {
    super(`Cannot override existing standards status on ${element}`);
  }
}
