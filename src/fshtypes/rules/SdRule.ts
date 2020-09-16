import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  BindingRule,
  InsertRule
} from '.';

export type SdRule =
  | CardRule
  | CaretValueRule
  | ContainsRule
  | AssignmentRule
  | FlagRule
  | ObeysRule
  | OnlyRule
  | BindingRule
  | InsertRule;
