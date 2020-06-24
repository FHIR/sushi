import { Rule } from './rules/Rule';
import { FshEntity } from './FshEntity';
import {
  InsertRule,
  MappingRule,
  CaretValueRule,
  FixedValueRule,
  FlagRule,
  CardRule,
  ContainsRule,
  ObeysRule,
  OnlyRule,
  ValueSetRule
} from './rules';
import { ValueSetComponent } from './ValueSetComponent';
import { FshConcept } from './FshConcept';

export class Profile extends FshEntity {
  id: string;
  parent?: string;
  title?: string;
  description?: string;
  mixins?: string[];
  rules: SdRule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.mixins = [];
    this.rules = [];
  }

  ruleIsAllowed(rule: Rule) {
    return !(
      rule instanceof InsertRule ||
      rule instanceof MappingRule ||
      rule instanceof ValueSetComponent ||
      rule instanceof FshConcept
    );
  }
}

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
