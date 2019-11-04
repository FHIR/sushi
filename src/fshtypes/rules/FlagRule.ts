import { Rule } from './Rule';

export class FlagRule extends Rule {
  mustSupport: boolean;
  summary: boolean;
  modifier: boolean;

  constructor(path: string) {
    super(path);
  }
}
