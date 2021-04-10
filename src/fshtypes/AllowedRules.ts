import { Profile, Extension, FshCodeSystem, FshValueSet, Instance, Mapping, RuleSet } from '.';
import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  BindingRule,
  ConceptRule,
  ValueSetComponentRule,
  MappingRule,
  Rule,
  PathRule
} from './rules';

const allowedRulesMap = new Map<any, any[]>([
  [
    Profile,
    [
      CardRule,
      CaretValueRule,
      ContainsRule,
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      BindingRule,
      PathRule
    ]
  ],
  [
    Extension,
    [
      CardRule,
      CaretValueRule,
      ContainsRule,
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      BindingRule,
      PathRule
    ]
  ],
  [Instance, [AssignmentRule, PathRule]],
  [FshValueSet, [ValueSetComponentRule, CaretValueRule]],
  [FshCodeSystem, [ConceptRule, CaretValueRule]],
  [Mapping, [MappingRule]],
  [
    RuleSet,
    [
      CardRule,
      CaretValueRule,
      ConceptRule,
      ContainsRule,
      AssignmentRule,
      FlagRule,
      MappingRule,
      ObeysRule,
      OnlyRule,
      ValueSetComponentRule,
      BindingRule,
      PathRule
    ]
  ]
]);

/**
 * Checks if a rule is allowed. In this context "allowed" means allowed to be exported, so an
 * InsertRule is not allowed anywhere, because you can't actually export an InsertRule, you must expand
 * it into its list of rules, and then export those rules.
 * @param fshDefinition
 * @param rule
 * @returns - true if rule is allowed on fshDefinition, false otherwise
 */
export function isAllowedRule(
  fshDefinition: Profile | Extension | Instance | FshValueSet | FshCodeSystem | Mapping | RuleSet,
  rule: Rule
): boolean {
  return allowedRulesMap.get(fshDefinition.constructor)?.some(r => rule instanceof r);
}
