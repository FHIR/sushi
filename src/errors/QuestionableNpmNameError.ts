export class QuestionableNpmNameError extends Error {
  constructor() {
    super('Target name does not appear to be a valid npm package name.');
  }
}
