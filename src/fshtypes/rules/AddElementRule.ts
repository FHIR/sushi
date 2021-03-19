import { Rule } from './Rule';
import { OnlyRuleType } from './OnlyRule';

export class AddElementRule extends Rule {
  min: number;
  max: string;
  types: OnlyRuleType[] = [];
  mustSupport?: boolean;
  summary?: boolean;
  modifier?: boolean;
  trialUse?: boolean;
  normative?: boolean;
  draft?: boolean;
  short?: string;
  definition?: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'AddElementRule';
  }
}
