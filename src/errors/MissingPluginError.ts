export class MissingPluginError extends Error {
  constructor(name: string) {
    super(`Could not find ${name} in project plugin directory.`);
  }
}
