import 'jest-extended';
import { get } from 'lodash';
import {
  Rule,
  CardRule,
  FlagRule,
  BindingRule,
  AssignmentRule,
  AssignmentValueType,
  OnlyRule,
  OnlyRuleType,
  ContainsRule,
  ContainsRuleItem,
  CaretValueRule,
  ObeysRule,
  MappingRule,
  InsertRule,
  PathRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule,
  AddElementRule,
  ConceptRule
} from '../../src/fshtypes/rules';
import { FshCode, ValueSetFilter } from '../../src/fshtypes';
import { splitOnPathPeriods } from '../../src/fhirtypes/common';
import { AUTOMATIC_DEPENDENCIES } from '../../src/utils';

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

export function assertBindingRule(
  rule: Rule,
  path: string,
  valueSet: string,
  strength: string
): void {
  expect(rule).toBeInstanceOf(BindingRule);
  const bindingRule = rule as BindingRule;
  expect(bindingRule.path).toBe(path);
  expect(bindingRule.valueSet).toBe(valueSet);
  expect(bindingRule.strength).toBe(strength);
}

export function assertAssignmentRule(
  rule: Rule,
  path: string,
  value: AssignmentValueType,
  exactly = false,
  isInstance = false,
  rawValue?: string
): void {
  expect(rule).toBeInstanceOf(AssignmentRule);
  const assignmentRule = rule as AssignmentRule;
  expect(assignmentRule.path).toBe(path);
  expect(assignmentRule.value).toEqual(value);
  expect(assignmentRule.exactly).toBe(exactly);
  expect(assignmentRule.isInstance).toEqual(isInstance);
  if (rawValue != null) {
    expect(assignmentRule.rawValue).toBe(rawValue);
  }
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
  value: AssignmentValueType,
  isInstance: boolean,
  pathArray?: string[],
  rawValue?: string
): void {
  expect(rule).toBeInstanceOf(CaretValueRule);
  const caretValueRule = rule as CaretValueRule;
  expect(caretValueRule.path).toBe(path);
  expect(caretValueRule.caretPath).toBe(caretPath);
  expect(caretValueRule.value).toEqual(value);
  expect(caretValueRule.isInstance).toBe(isInstance);
  expect(caretValueRule.pathArray).toEqual(pathArray ?? splitOnPathPeriods(path).filter(p => p));
  if (rawValue != null) {
    expect(caretValueRule.rawValue).toBe(rawValue);
  }
}

export function assertObeysRule(rule: Rule, path: string, invariant: string) {
  expect(rule).toBeInstanceOf(ObeysRule);
  const obeysRule = rule as ObeysRule;
  expect(obeysRule.path).toBe(path);
  expect(obeysRule.invariant).toBe(invariant);
}

export function assertInsertRule(
  rule: Rule,
  path: string,
  ruleSet: string,
  params: string[] = [],
  pathArray: string[] = []
) {
  expect(rule).toBeInstanceOf(InsertRule);
  const insertRule = rule as InsertRule;
  expect(insertRule.path).toBe(path);
  expect(insertRule.ruleSet).toBe(ruleSet);
  expect(insertRule.params).toEqual(params);
  expect(insertRule.pathArray).toEqual(pathArray);
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

export interface AddElementCard {
  min: number;
  max: string;
}

export interface AddElementFlags {
  mustSupport?: boolean;
  summary?: boolean;
  modifier?: boolean;
  trialUse?: boolean;
  normative?: boolean;
  draft?: boolean;
}

export interface AddElementType {
  type: string;
  isReference?: boolean;
  isCanonical?: boolean;
  isCodeableReference?: boolean;
}

export interface AddElementDefs {
  short?: string;
  definition?: string;
  contentReference?: string;
}

export interface AddElementArgs {
  card: AddElementCard;
  flags?: AddElementFlags;
  types: AddElementType[];
  defs?: AddElementDefs;
}

export function assertAddElementRule(rule: Rule, path: string, args: AddElementArgs): void {
  expect(rule).toBeInstanceOf(AddElementRule);
  const addElementRule = rule as AddElementRule;
  expect(addElementRule.constructorName).toStrictEqual('AddElementRule');
  expect(addElementRule.path).toBe(path);

  expect(addElementRule.min).toBe(args.card.min);
  expect(addElementRule.max).toBe(args.card.max);

  if (args.flags) {
    if (args.flags.mustSupport) {
      expect(addElementRule.mustSupport).toBe(args.flags.mustSupport);
    }
    if (args.flags.summary) {
      expect(addElementRule.summary).toBe(args.flags.summary);
    }
    if (args.flags.modifier) {
      expect(addElementRule.modifier).toBe(args.flags.modifier);
    }
    if (args.flags.trialUse) {
      expect(addElementRule.trialUse).toBe(args.flags.trialUse);
    }
    if (args.flags.normative) {
      expect(addElementRule.normative).toBe(args.flags.normative);
    }
    if (args.flags.draft) {
      expect(addElementRule.draft).toBe(args.flags.draft);
    }
  }

  // The parser does not return the 'isReference', 'isCanonical', or 'isCodeableReference' attribute if they are false.
  // To compare with the test's expected values, we need to remove the args.type's 'isReference',
  // 'isCanonical', and/or 'isCodeableReference' attributes when they are false.
  const expectedTypes = args.types.map(t => {
    if (get(t, 'isReference', false)) {
      return { type: t.type, isReference: true };
    } else if (get(t, 'isCanonical', false)) {
      return { type: t.type, isCanonical: true };
    } else if (get(t, 'isCodeableReference', false)) {
      return { type: t.type, isCodeableReference: true };
    }
    return { type: t.type };
  });
  expect(addElementRule.types).toIncludeSameMembers(expectedTypes);

  if (args.defs) {
    if (args.defs.short) {
      expect(addElementRule.short).toBe(args.defs.short);
    }
    if (args.defs.definition) {
      expect(addElementRule.definition).toBe(args.defs.definition);
    }
    if (args.defs.contentReference) {
      expect(addElementRule.contentReference).toBe(args.defs.contentReference);
    }
  }
}
export function assertConceptRule(
  rule: Rule,
  code: string,
  display?: string,
  definition?: string,
  hierarchy?: string[]
) {
  expect(rule).toBeInstanceOf(ConceptRule);
  const conceptRule = rule as ConceptRule;
  expect(conceptRule.code).toBe(code);
  expect(conceptRule.display).toBe(display);
  expect(conceptRule.definition).toBe(definition);
  if (hierarchy !== undefined) {
    expect(conceptRule.hierarchy).toEqual(hierarchy);
  }
}

export function assertAutomaticR4Dependencies(packages: string[]) {
  AUTOMATIC_DEPENDENCIES.forEach(dep => {
    if (dep.packageId === 'hl7.terminology.r4' && dep.version === 'latest') {
      expect(packages).toContain('hl7.terminology.r4#1.2.3-test');
    } else if (dep.packageId === 'hl7.fhir.uv.extensions.r4' && dep.version === 'latest') {
      expect(packages).toContain('hl7.fhir.uv.extensions.r4#4.5.6-test');
    } else if (!dep.packageId.endsWith('.r5') && !dep.isSupplementalFHIRPackage) {
      expect(packages).toContain(`${dep.packageId}#${dep.version}`);
    }
  });
}

export function assertAutomaticR5Dependencies(packages: string[]) {
  AUTOMATIC_DEPENDENCIES.forEach(dep => {
    if (dep.packageId === 'hl7.terminology.r5' && dep.version === 'latest') {
      expect(packages).toContain('hl7.terminology.r5#1.2.3-test');
    } else if (dep.packageId === 'hl7.fhir.uv.extensions.r5' && dep.version === 'latest') {
      expect(packages).toContain('hl7.fhir.uv.extensions.r5#4.5.6-test');
    } else if (!dep.packageId.endsWith('.r4') && !dep.isSupplementalFHIRPackage) {
      expect(packages).toContain(`${dep.packageId}#${dep.version}`);
    }
  });
}

export function assertPathRule(rule: Rule, path: string) {
  expect(rule).toBeInstanceOf(PathRule);
  const pathRule = rule as PathRule;
  expect(pathRule.path).toBe(path);
}
