import { Rule } from './Rule';

export class PathRule extends Rule {
  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'PathRule';
  }

  toFSH(): string {
    return `* ${this.path}`;
  }
}
