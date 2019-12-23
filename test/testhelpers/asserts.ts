import {
  Rule,
  CardRule,
  FlagRule,
  ValueSetRule,
  FixedValueRule,
  FixedValueType,
  OnlyRule,
  OnlyRuleType,
  ContainsRule,
  CaretValueRule
} from '../../src/fshtypes/rules';
import {
  ValueSetComponent,
  ValueSetConceptComponent,
  FshCode,
  ValueSetFilterComponent,
  ValueSetFilter
} from '../../src/fshtypes';

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

export function assertFixedValueRule(rule: Rule, path: string, value: FixedValueType): void {
  expect(rule).toBeInstanceOf(FixedValueRule);
  const fixedValueRule = rule as FixedValueRule;
  expect(fixedValueRule.path).toBe(path);
  expect(fixedValueRule.fixedValue).toEqual(value);
}

export function assertOnlyRule(rule: Rule, path: string, ...types: OnlyRuleType[]): void {
  expect(rule).toBeInstanceOf(OnlyRule);
  const onlyRule = rule as OnlyRule;
  expect(onlyRule.path).toBe(path);
  expect(onlyRule.types).toEqual(types);
}

export function assertContainsRule(rule: Rule, path: string, ...items: string[]): void {
  expect(rule).toBeInstanceOf(ContainsRule);
  const containsRule = rule as ContainsRule;
  expect(containsRule.path).toBe(path);

  expect(containsRule.items).toEqual(items);
}

export function assertCaretValueRule(
  rule: Rule,
  path: string,
  caretPath: string,
  value: FixedValueType
): void {
  expect(rule).toBeInstanceOf(CaretValueRule);
  const caretValueRule = rule as CaretValueRule;
  expect(caretValueRule.path).toBe(path);
  expect(caretValueRule.caretPath).toBe(caretPath);
  expect(caretValueRule.value).toEqual(value);
}

export function assertValueSetConceptComponent(
  component: ValueSetComponent,
  fromSystem: string,
  fromValueSets: string[],
  concepts: FshCode[]
): void {
  expect(component).toBeInstanceOf(ValueSetConceptComponent);
  const conceptComponent = component as ValueSetConceptComponent;
  expect(conceptComponent.from.system).toBe(fromSystem);
  expect(conceptComponent.from.valueSets).toEqual(fromValueSets);
  expect(conceptComponent.concepts).toEqual(concepts);
}

export function assertValueSetFilterComponent(
  component: ValueSetComponent,
  fromSystem: string,
  fromValueSets: string[],
  filters: ValueSetFilter[]
): void {
  expect(component).toBeInstanceOf(ValueSetFilterComponent);
  const filterComponent = component as ValueSetFilterComponent;
  expect(filterComponent.from.system).toBe(fromSystem);
  expect(filterComponent.from.valueSets).toEqual(fromValueSets);
  expect(filterComponent.filters).toEqual(filters);
}
