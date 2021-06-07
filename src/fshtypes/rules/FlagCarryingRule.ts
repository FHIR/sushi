import { Rule } from './Rule';

// This is a common base class for FlagRule and AddElementRule, both of which carry flags.
// This capability was originally implemented as a mixin, but that approach was not
// compatible w/ FSHOnline (for unknown and difficult to debug reasons).
export abstract class FlagCarryingRule extends Rule {
  mustSupport?: boolean;
  summary?: boolean;
  modifier?: boolean;
  trialUse?: boolean;
  normative?: boolean;
  draft?: boolean;

  get flags(): string[] {
    const flags: string[] = [];
    if (this.mustSupport) flags.push('MS');
    if (this.modifier) flags.push('?!');
    if (this.summary) flags.push('SU');
    if (this.draft) flags.push('D');
    else if (this.trialUse) flags.push('TU');
    else if (this.normative) flags.push('N');

    return flags;
  }
}
