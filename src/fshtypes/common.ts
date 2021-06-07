import { OnlyRuleType } from './rules/OnlyRule';
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
