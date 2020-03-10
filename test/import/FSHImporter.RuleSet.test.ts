import { importSingleText } from '../testhelpers/importSingleText';
import { assertValueSetRule, assertFixedValueRule, assertCardRule } from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('FSHImporter', () => {
  beforeAll(() => {
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
      assertFixedValueRule(ruleSet.rules[0], 'active', true);
    });

    it('should parse a RuleSet with multiple rules', () => {
      const input = `
        RuleSet: RuleRuleSet
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * active = true
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
      assertValueSetRule(
        ruleSet.rules[0],
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertFixedValueRule(ruleSet.rules[1], 'active', true);
      assertCardRule(ruleSet.rules[2], 'contact', 1, '1');
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
  });
});
