export class RawFSH {
  public readonly path: string;
  constructor(public readonly content: string, path?: string) {
    this.path = path ?? '';
  }
}
