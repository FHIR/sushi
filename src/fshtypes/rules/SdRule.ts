import {
  CardRule,
  CaretValueRule,
  ContainsRule,
  FixedValueRule,
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
  | FixedValueRule
  | FlagRule
  | ObeysRule
  | OnlyRule
  | ValueSetRule
  | InsertRule;
