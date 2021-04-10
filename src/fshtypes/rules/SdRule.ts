import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  BindingRule,
  InsertRule,
  PathRule
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
  | InsertRule
  | PathRule;
