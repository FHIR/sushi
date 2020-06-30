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
  ContainsRuleItem,
  CaretValueRule,
  ObeysRule,
  MappingRule,
  InsertRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../../src/fshtypes/rules';
import { FshCode, ValueSetFilter } from '../../src/fshtypes';

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
  modifier: boolean,
  trialUse: boolean,
  normative: boolean,
  draft: boolean
): void {
  expect(rule).toBeInstanceOf(FlagRule);
  const flagRule = rule as FlagRule;
  expect(flagRule.path).toBe(path);
  expect(flagRule.mustSupport).toBe(mustSupport);
  expect(flagRule.summary).toBe(summary);
  expect(flagRule.modifier).toBe(modifier);
  expect(flagRule.trialUse).toBe(trialUse);
  expect(flagRule.normative).toBe(normative);
  expect(flagRule.draft).toBe(draft);
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
  value: FixedValueType,
  exactly = false,
  isInstance = false
): void {
  expect(rule).toBeInstanceOf(FixedValueRule);
  const fixedValueRule = rule as FixedValueRule;
  expect(fixedValueRule.path).toBe(path);
  expect(fixedValueRule.fixedValue).toEqual(value);
  expect(fixedValueRule.exactly).toBe(exactly);
  expect(fixedValueRule.isInstance).toEqual(isInstance);
}

export function assertOnlyRule(rule: Rule, path: string, ...types: OnlyRuleType[]): void {
  expect(rule).toBeInstanceOf(OnlyRule);
  const onlyRule = rule as OnlyRule;
  expect(onlyRule.path).toBe(path);
  expect(onlyRule.types).toEqual(types);
}

export function assertContainsRule(
  rule: Rule,
  path: string,
  ...items: (string | ContainsRuleItem)[]
): void {
  expect(rule).toBeInstanceOf(ContainsRule);
  const containsRule = rule as ContainsRule;
  expect(containsRule.path).toBe(path);

  const itemObjects: ContainsRuleItem[] = items.map(i => (typeof i === 'string' ? { name: i } : i));
  expect(containsRule.items).toEqual(itemObjects);
}

export function assertCaretValueRule(
  rule: Rule,
  path: string,
  caretPath: string,
  value: FixedValueType,
  isInstance: boolean
): void {
  expect(rule).toBeInstanceOf(CaretValueRule);
  const caretValueRule = rule as CaretValueRule;
  expect(caretValueRule.path).toBe(path);
  expect(caretValueRule.caretPath).toBe(caretPath);
  expect(caretValueRule.value).toEqual(value);
  expect(caretValueRule.isInstance).toBe(isInstance);
}

export function assertObeysRule(rule: Rule, path: string, invariant: string) {
  expect(rule).toBeInstanceOf(ObeysRule);
  const obeysRule = rule as ObeysRule;
  expect(obeysRule.path).toBe(path);
  expect(obeysRule.invariant).toBe(invariant);
}

export function assertInsertRule(rule: Rule, ruleSet: string) {
  expect(rule).toBeInstanceOf(InsertRule);
  const insertRule = rule as InsertRule;
  expect(insertRule.path).toBe('');
  expect(insertRule.ruleSet).toBe(ruleSet);
}

export function assertMappingRule(
  rule: Rule,
  path: string,
  map: string,
  comment: string,
  language: FshCode
) {
  expect(rule).toBeInstanceOf(MappingRule);
  const mappingRule = rule as MappingRule;
  expect(mappingRule.path).toBe(path);
  expect(mappingRule.map).toBe(map);
  expect(mappingRule.comment).toBe(comment);
  expect(mappingRule.language).toEqual(language);
}

export function assertValueSetConceptComponent(
  component: Rule,
  fromSystem: string,
  fromValueSets: string[],
  concepts: FshCode[],
  included = true
): void {
  expect(component).toBeInstanceOf(ValueSetConceptComponentRule);
  const conceptComponent = component as ValueSetConceptComponentRule;
  expect(conceptComponent.from.system).toBe(fromSystem);
  expect(conceptComponent.from.valueSets).toEqual(fromValueSets);
  expect(conceptComponent.concepts).toEqual(concepts);
  expect(conceptComponent.inclusion).toBe(included);
}

export function assertValueSetFilterComponent(
  component: Rule,
  fromSystem: string,
  fromValueSets: string[],
  filters: ValueSetFilter[],
  included = true
): void {
  expect(component).toBeInstanceOf(ValueSetFilterComponentRule);
  const filterComponent = component as ValueSetFilterComponentRule;
  expect(filterComponent.from.system).toBe(fromSystem);
  expect(filterComponent.from.valueSets).toEqual(fromValueSets);
  expect(filterComponent.filters).toEqual(filters);
  expect(filterComponent.inclusion).toBe(included);
}
