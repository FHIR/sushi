export class RawFSH {
  public readonly path: string;
  constructor(public content: string, path?: string) {
    this.path = path ?? '';
  }
}
