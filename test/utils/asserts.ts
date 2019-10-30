import { Code, Quantity, Ratio } from '../../src/fshtypes';
import {
  Rule,
  CardRule,
  FlagRule,
  ValueSetRule,
  FixedValueRule,
  OnlyRule
} from '../../src/fshtypes/rules';

export function assertCardRule(rule: Rule, path: string, min: number, max: number | string): void {
  expect(rule).toBeInstanceOf(CardRule);
  const cardRule = rule as CardRule;
  expect(cardRule.path).toBe(path);
  expect(cardRule.min).toBe(min);
  expect(cardRule.max).toBe(max.toString());
}

export function assertFlagRule(
  rule: Rule,
  path: string,
  mustSupport: boolean,
  summary: boolean,
  modifier: boolean
): void {
  expect(rule).toBeInstanceOf(FlagRule);
  const flagRule = rule as FlagRule;
  expect(flagRule.path).toBe(path);
  expect(flagRule.mustSupport).toBe(mustSupport);
  expect(flagRule.summary).toBe(summary);
  expect(flagRule.modifier).toBe(modifier);
}

export function assertValueSetRule(
  rule: Rule,
  path: string,
  valueSet: string,
  strength: string
): void {
  expect(rule).toBeInstanceOf(ValueSetRule);
  const valueSetRule = rule as ValueSetRule;
  expect(valueSetRule.path).toBe(path);
  expect(valueSetRule.valueSet).toBe(valueSet);
  expect(valueSetRule.strength).toBe(strength);
}

export function assertFixedValueRule(
  rule: Rule,
  path: string,
  value: boolean | number | string | Code | Quantity | Ratio
): void {
  expect(rule).toBeInstanceOf(FixedValueRule);
  const fixedValueRule = rule as FixedValueRule;
  expect(fixedValueRule.path).toBe(path);
  expect(fixedValueRule.fixedValue).toEqual(value);
}

export function assertOnlyRule(rule: Rule, path: string, ...types: string[]): void {
  expect(rule).toBeInstanceOf(OnlyRule);
  const onlyRule = rule as OnlyRule;
  expect(onlyRule.path).toBe(path);
  expect(onlyRule.types).toEqual(types);
}
