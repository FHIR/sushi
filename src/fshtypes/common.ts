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

// Looking up an id, url, name, or version scans every rule on the definition, and the FSHTank does this for
// every entity on every fish. For definitions with many rules (e.g., large code systems) that scan dominates
// the build, so the result of each lookup is cached against the definition's rules array. The cache is keyed
// on the array itself and checked against the array's length and last rule, so it is invalidated when rules
// are added or removed and when the array is replaced (as applyInsertRules does).
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
  const isInstanceRule = fshDefinition instanceof Instance || fshDefinition instanceof Invariant;
  const key = isInstanceRule
    ? `assignment|${assignmentRulePath}`
    : `caret|${caretRulePath}|${caretRuleCaretPath}`;
  if (!cache.found.has(key)) {
    if (isInstanceRule) {
      cache.found.set(
        key,
        findLast(
          rules,
          rule => rule instanceof AssignmentRule && rule.path === assignmentRulePath
        ) as AssignmentRule
      );
    } else {
      cache.found.set(
        key,
        findLast(
          rules,
          rule =>
            rule instanceof CaretValueRule &&
            rule.path === caretRulePath &&
            rule.caretPath === caretRuleCaretPath
        ) as CaretValueRule
      );
    }
  }
  return cache.found.get(key);
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
