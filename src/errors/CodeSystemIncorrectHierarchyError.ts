export class CodeSystemIncorrectHierarchyError extends Error {
  constructor(public system: string, public code: string) {
    super(`CodeSystem ${system} does not have the specified hierarchy to add code ${code}`);
  }
}
