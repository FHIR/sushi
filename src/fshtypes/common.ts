import { OnlyRuleType } from './rules/OnlyRule';

export function typeString(types: OnlyRuleType[]): string {
  const references: OnlyRuleType[] = [];
  const canonicals: OnlyRuleType[] = [];
  const normals: OnlyRuleType[] = [];
  types.forEach(t => {
    if (t.isReference) {
      references.push(t);
    } else if (t.isCanonical) {
      canonicals.push(t);
    } else {
      normals.push(t);
    }
  });
  const normalString = normals.map(t => t.type).join(' or ');
  const referenceString = references.length
    ? `Reference(${references.map(t => t.type).join(' or ')})`
    : '';
  const canonicalString = canonicals.length
    ? `Canonical(${canonicals.map(t => t.type).join(' or ')})`
    : '';
  return [normalString, referenceString, canonicalString].filter(s => s).join(' or ');
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
