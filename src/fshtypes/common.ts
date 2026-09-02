import { Extension } from './Extension';
import { FshCodeSystem } from './FshCodeSystem';
import { FshValueSet } from './FshValueSet';
import { Instance } from './Instance';
import { Invariant } from './Invariant';
import { Logical } from './Logical';
import { Mapping } from './Mapping';
import { Profile } from './Profile';
import { Resource } from './Resource';
import { RuleSet } from './RuleSet';
import { CaretValueRule, OnlyRuleType, AssignmentRule, Rule } from './rules';
import { findLast } from 'lodash';

export function typeString(types: OnlyRuleType[]): string {
  const references: OnlyRuleType[] = [];
  const canonicals: OnlyRuleType[] = [];
  const codeableReferences: OnlyRuleType[] = [];
  const normals: OnlyRuleType[] = [];
  types.forEach(t => {
    if (t.isReference) {
      references.push(t);
    } else if (t.isCanonical) {
      canonicals.push(t);
    } else if (t.isCodeableReference) {
      codeableReferences.push(t);
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
  const codeableReferenceString = codeableReferences.length
    ? `CodeableReference(${codeableReferences.map(t => t.type).join(' or ')})`
    : '';
  return [normalString, referenceString, canonicalString, codeableReferenceString]
    .filter(s => s)
    .join(' or ');
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

// Looking up a rule by path (e.g., a definition's id, url, name, or version) scans every rule on the
// definition, and the FSHTank does this for every entity it checks on every fish. For definitions with many
// rules (e.g., large code systems) that scan dominated the build, so the rule found by each lookup is cached
// against the definition's rules array. Rules arrays are only appended to or replaced wholesale (as
// applyInsertRules does), so the cache is checked against the array's length and last rule. The rule rather
// than its value is cached, so a change to the rule's value is still seen, and a cached rule is re-checked
// against the lookup in case its path was changed in place (as CodeSystemExporter does to code caret rules).
// Replacing a rule in the middle of the array, or changing a rule so that it newly matches a lookup, would
// not be seen; no code does either.
const assignmentCache = new WeakMap<
  Rule[],
  { length: number; lastRule: Rule; found: Map<string, AssignmentRule | CaretValueRule> }
>();

export function findAssignmentByPath(
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | FshValueSet
    | FshCodeSystem
    | Instance
    | RuleSet
    | Mapping,
  assignmentRulePath: string,
  caretRulePath: string,
  caretRuleCaretPath: string
) {
  const rules: Rule[] = fshDefinition.rules;
  let cache = assignmentCache.get(rules);
  if (
    cache == null ||
    cache.length !== rules.length ||
    cache.lastRule !== rules[rules.length - 1]
  ) {
    cache = { length: rules.length, lastRule: rules[rules.length - 1], found: new Map() };
    assignmentCache.set(rules, cache);
  }
  let key: string;
  let matches: (rule: Rule) => boolean;
  if (fshDefinition instanceof Instance || fshDefinition instanceof Invariant) {
    key = `assignment|${assignmentRulePath}`;
    matches = rule => rule instanceof AssignmentRule && rule.path === assignmentRulePath;
  } else {
    key = `caret|${caretRulePath}|${caretRuleCaretPath}`;
    matches = rule =>
      rule instanceof CaretValueRule &&
      rule.path === caretRulePath &&
      rule.caretPath === caretRuleCaretPath;
  }
  let found = cache.found.get(key);
  if (!cache.found.has(key) || (found != null && !matches(found))) {
    found = findLast(rules, matches) as AssignmentRule | CaretValueRule;
    cache.found.set(key, found);
  }
  return found;
}

/**
 * A helper function used to determine the value of either an assignment rule or a caret value rule
 * @param fshDefinition  the FSH definition
 * @param assignmentRulePath the path of the assignment rule whose value we want
 * @param caretRulePath the path of the caret value rule whose value we want
 * @param caretRuleCaretPath the caret path of the caret value rule
 * @returns an object with the value set by either the assignment rule or the caret value rule, and whether or not the value represents an instance,
 * or undefined if neither rule is set on the definition
 */
export function getValueFromRules(
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | FshValueSet
    | FshCodeSystem
    | Instance
    | RuleSet
    | Mapping,
  assignmentRulePath: string,
  caretRulePath: string,
  caretRuleCaretPath: string
) {
  const foundRule = findAssignmentByPath(
    fshDefinition,
    assignmentRulePath,
    caretRulePath,
    caretRuleCaretPath
  );
  if (foundRule) {
    return { value: foundRule.value, isInstance: foundRule.isInstance };
  }
}

export function getNonInstanceValueFromRules(
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | FshValueSet
    | FshCodeSystem
    | Instance
    | RuleSet
    | Mapping,
  assignmentRulePath: string,
  caretRulePath: string,
  caretRuleCaretPath: string
) {
  const foundValue = getValueFromRules(
    fshDefinition,
    assignmentRulePath,
    caretRulePath,
    caretRuleCaretPath
  );
  if (foundValue && !foundValue.isInstance) {
    return foundValue.value;
  }
}
