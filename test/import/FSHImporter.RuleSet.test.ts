import { importSingleText } from '../testhelpers/importSingleText';
import {
  assertBindingRule,
  assertAssignmentRule,
  assertCardRule,
  assertInsertRule,
  assertValueSetConceptComponent,
  assertAddElementRule,
  assertCaretValueRule,
  assertConceptRule
} from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { Rule, ConceptRule } from '../../src/fshtypes/rules';
import { FshCode } from '../../src/fshtypes';

describe('FSHImporter', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('RuleSet', () => {
    it('should parse a RuleSet with a rule', () => {
      const input = `
        RuleSet: OneRuleSet
        * active = true
        `;
      const result = importSingleText(input, 'OneRule.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('OneRuleSet');
      expect(ruleSet.name).toBe('OneRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 3,
        endColumn: 23
      });
      expect(ruleSet.sourceInfo.file).toBe('OneRule.fsh');
      assertAssignmentRule(ruleSet.rules[0] as Rule, 'active', true);
    });

    it('should parse a RuleSet with a numeric name', () => {
      const input = `
        RuleSet: 123
        * active = true
        `;
      const result = importSingleText(input, 'NumericName.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('123');
      expect(ruleSet.name).toBe('123');
    });

    it('should parse a RuleSet with multiple rules', () => {
      const input = `
        RuleSet: RuleRuleSet
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * active = true (exactly)
        * contact 1..1
        `;
      const result = importSingleText(input, 'Rules.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('RuleRuleSet');
      expect(ruleSet.name).toBe('RuleRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 5,
        endColumn: 22
      });
      assertBindingRule(
        ruleSet.rules[0] as Rule,
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertAssignmentRule(ruleSet.rules[1] as Rule, 'active', true, true);
      assertCardRule(ruleSet.rules[2] as Rule, 'contact', 1, '1');
    });

    it('should parse a RuleSet with an insert rule', () => {
      const input = `
        RuleSet: RuleRuleSet
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * insert OtherRuleSet
        * contact 1..1
        `;
      const result = importSingleText(input, 'Rules.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('RuleRuleSet');
      expect(ruleSet.name).toBe('RuleRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 5,
        endColumn: 22
      });
      assertBindingRule(
        ruleSet.rules[0] as Rule,
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertInsertRule(ruleSet.rules[1] as Rule, '', 'OtherRuleSet');
      assertCardRule(ruleSet.rules[2] as Rule, 'contact', 1, '1');
    });

    it('should parse a RuleSet with an AddElementRule', () => {
      const input = `
        RuleSet: RuleRuleSet
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * contact 1..1
        * newStuff 0..* string "short for newStuff property"
        `;
      const result = importSingleText(input, 'Rules.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('RuleRuleSet');
      expect(ruleSet.name).toBe('RuleRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 5,
        endColumn: 60
      });
      assertBindingRule(
        ruleSet.rules[0] as Rule,
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertCardRule(ruleSet.rules[1] as Rule, 'contact', 1, '1');
      assertAddElementRule(ruleSet.rules[2], 'newStuff', {
        card: { min: 0, max: '*' },
        types: [{ type: 'string' }],
        defs: { short: 'short for newStuff property', definition: 'short for newStuff property' }
      });
    });

    it('should parse a RuleSet with rules, ValueSetComponents, ConceptRules, and CaretValueRules', () => {
      const input = `
        RuleSet: RuleRuleSet
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * #bear from system ZOO
        * #lion
        * #lion ^designation.value = "Watch out for big cat!"
        `;
      const result = importSingleText(input, 'Rules.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('RuleRuleSet');
      expect(ruleSet.name).toBe('RuleRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 6,
        endColumn: 61
      });
      expect(ruleSet.rules).toHaveLength(4);
      assertBindingRule(
        ruleSet.rules[0] as Rule,
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertValueSetConceptComponent(ruleSet.rules[1], 'ZOO', undefined, [
        new FshCode('bear', 'ZOO').withLocation([4, 11, 4, 15]).withFile('Rules.fsh')
      ]);
      const concept = ruleSet.rules[2];
      expect(concept).toEqual(
        new ConceptRule('lion').withFile('Rules.fsh').withLocation([5, 9, 5, 15])
      );
      assertCaretValueRule(
        ruleSet.rules[3],
        '',
        'designation.value',
        'Watch out for big cat!',
        false,
        ['lion']
      );
      expect(ruleSet.rules[3].sourceInfo.location).toEqual({
        startLine: 6,
        startColumn: 9,
        endLine: 6,
        endColumn: 61
      });
    });

    it('should log an error when parsing a mixin with no rules', () => {
      const input = `
        RuleSet: EmptyRuleSet
        `;
      const result = importSingleText(input, 'Empty.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('EmptyRuleSet');
      expect(ruleSet.name).toBe('EmptyRuleSet');
      expect(ruleSet.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 2,
        endColumn: 29
      });
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Empty\.fsh.*Line: 4\D*/s);
    });

    it('should log an error and skip the RuleSet when encountering a RuleSet with a name used by another RuleSet', () => {
      const input = `
      RuleSet: SameRuleSet
      * gender 0..0

      RuleSet: SameRuleSet
      * active = true
      `;
      const result = importSingleText(input, 'SameName.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('SameRuleSet');
      expect(ruleSet.rules.length).toBe(1);
      assertCardRule(ruleSet.rules[0] as Rule, 'gender', 0, '0');
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /RuleSet named SameRuleSet already exists/s
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 5 - 6\D*/s);
    });

    it('should not log an error when the ConceptRule has one code with a system, no definition, and no hierarchy', () => {
      const input = `
      RuleSet: VSRuleSet
      * ZOO#bear
      * ZOO#gator "Alligator"
      `;
      const result = importSingleText(input, 'VSRules.fsh');
      expect(result.ruleSets.size).toBe(1);
      const ruleSet = result.ruleSets.get('VSRuleSet');
      expect(ruleSet.rules.length).toBe(2);
      assertConceptRule(ruleSet.rules[0], 'bear', undefined, undefined, []);
      assertConceptRule(ruleSet.rules[1], 'gator', 'Alligator', undefined, []);
      expect(loggerSpy.getAllMessages('error')).toBeEmpty();
    });
  });
});
