import { Rule } from './Rule';

export class CardRule extends Rule {
  min: number;
  max: string;

  constructor(path: string) {
    super(path);
  }
}
