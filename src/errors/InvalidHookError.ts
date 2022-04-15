export class InvalidHookError extends Error {
  constructor(badHook: string, availableHooks: string[]) {
    super(
      `Cannot bind function to hook ${badHook}. Available hooks are: ${availableHooks.join(', ')}`
    );
  }
}
