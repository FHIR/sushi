import { OnlyRuleType } from './rules';
import { partition } from 'lodash';

export function typeString(types: OnlyRuleType[]): string {
  const [references, nonReferences] = partition(types, t => t.isReference);
  const nonReferenceString = nonReferences.map(t => t.type).join(' or ');
  const referenceString = references.length
    ? `Reference(${references.map(t => t.type).join(' or ')})`
    : '';
  return [nonReferenceString, referenceString].filter(s => s).join(' or ');
}

// Adds expected backslash-escapes to a string to make it a FSH string
export function fshifyString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export class HasFlags {
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
