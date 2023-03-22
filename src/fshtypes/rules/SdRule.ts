import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  BindingRule,
  PathRule,
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
  | PathRule
  | InsertRule;
