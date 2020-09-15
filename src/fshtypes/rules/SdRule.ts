import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  AssignmentRule,
  FlagRule,
  ObeysRule,
  OnlyRule,
  ValueSetRule,
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
  | ValueSetRule
  | InsertRule;
