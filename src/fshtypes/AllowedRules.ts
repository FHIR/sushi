import {
  Profile,
  Extension,
  FshCodeSystem,
  FshValueSet,
  Instance,
  Mapping,
  RuleSet,
  Logical,
  Resource
} from '.';
import {
  AddElementRule,
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
  PathRule,
  Rule
} from './rules';

const allowedRulesMap = new Map<any, any[]>([
  [
    'Profile',
    [
      CardRule,
      CaretValueRule,
      ContainsRule,
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      PathRule,
      BindingRule
    ]
  ],
  [
    'Extension',
    [
      CardRule,
      CaretValueRule,
      ContainsRule,
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      PathRule,
      BindingRule
    ]
  ],
  ['Instance', [AssignmentRule, PathRule]],
  ['FshValueSet', [ValueSetComponentRule, CaretValueRule]],
  ['FshCodeSystem', [ConceptRule, CaretValueRule]],
  ['Mapping', [MappingRule, PathRule]],
  [
    'RuleSet',
    [
      AddElementRule,
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
      PathRule,
      BindingRule
    ]
  ],
  [
    'Logical',
    [
      AddElementRule,
      CardRule,
      CaretValueRule,
      // NO ContainsRule!
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      PathRule,
      BindingRule
    ]
  ],
  [
    'Resource',
    [
      AddElementRule,
      CardRule,
      CaretValueRule,
      // NO ContainsRule!
      AssignmentRule,
      FlagRule,
      ObeysRule,
      OnlyRule,
      PathRule,
      BindingRule
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
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | Instance
    | FshValueSet
    | FshCodeSystem
    | Mapping
    | RuleSet,
  rule: Rule
): boolean {
  return allowedRulesMap.get(fshDefinition.constructorName)?.some(r => rule instanceof r);
}
