import { Rule } from './Rule';

export class CardRule extends Rule {
  min: number;
  max: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'CardRule';
  }

  cardToString(): string {
    return `${this.min && !isNaN(this.min) ? this.min : ''}..${this.max ?? ''}`;
  }

  toFSH(): string {
    return `* ${this.path} ${this.cardToString()}`;
  }
}
