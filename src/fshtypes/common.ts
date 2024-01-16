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
import { CaretValueRule, OnlyRuleType, AssignmentRule } from './rules';
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
  if (fshDefinition instanceof Instance || fshDefinition instanceof Invariant) {
    return findLast(
      fshDefinition.rules,
      rule => rule instanceof AssignmentRule && rule.path === assignmentRulePath
    ) as AssignmentRule;
  } else {
    return findLast(
      fshDefinition.rules,
      rule =>
        rule instanceof CaretValueRule &&
        rule.path === caretRulePath &&
        rule.caretPath === caretRuleCaretPath
    ) as CaretValueRule;
  }
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
