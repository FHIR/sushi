import { Rule } from './Rule';

export class CardRule extends Rule {
  constructorName = 'CardRule';
  min: number;
  max: string;

  constructor(path: string) {
    super(path);
  }
}
