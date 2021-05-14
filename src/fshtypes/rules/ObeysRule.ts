import { Rule } from './Rule';

export class ObeysRule extends Rule {
  invariant: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'ObeysRule';
  }

  toFSH(): string {
    return `* ${this.path === '.' ? '' : `${this.path} `}obeys ${this.invariant}`;
  }
}
