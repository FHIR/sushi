import { Rule } from './Rule';

export class FlagRule extends Rule {
  mustSupport: boolean;
  summary: boolean;
  modifier: boolean;
  trialUse: boolean;
  normative: boolean;
  draft: boolean;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'FlagRule';
  }
}
