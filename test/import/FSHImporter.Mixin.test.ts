import { importSingleText } from '../testhelpers/importSingleText';
import { assertValueSetRule, assertFixedValueRule, assertCardRule } from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';

describe('FSHImporter', () => {
  beforeAll(() => {
    loggerSpy.reset();
  });

  describe('Mixin', () => {
    it('should parse a Mixin with a rule', () => {
      const input = `
        Mixin: OneRuleMixin
        * active = true
        `;
      const result = importSingleText(input, 'OneRule.fsh');
      expect(result.mixins.size).toBe(1);
      const mixin = result.mixins.get('OneRuleMixin');
      expect(mixin.name).toBe('OneRuleMixin');
      expect(mixin.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 3,
        endColumn: 23
      });
      expect(mixin.sourceInfo.file).toBe('OneRule.fsh');
      assertFixedValueRule(mixin.rules[0], 'active', true);
    });

    it('should parse a Mixin with multiple rules', () => {
      const input = `
        Mixin: RuleMixin
        * gender from https://www.hl7.org/fhir/valueset-administrative-gender.html
        * active = true
        * contact 1..1
        `;
      const result = importSingleText(input, 'Rules.fsh');
      expect(result.mixins.size).toBe(1);
      const mixin = result.mixins.get('RuleMixin');
      expect(mixin.name).toBe('RuleMixin');
      expect(mixin.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 5,
        endColumn: 22
      });
      assertValueSetRule(
        mixin.rules[0],
        'gender',
        'https://www.hl7.org/fhir/valueset-administrative-gender.html',
        'required'
      );
      assertFixedValueRule(mixin.rules[1], 'active', true);
      assertCardRule(mixin.rules[2], 'contact', 1, '1');
    });

    it('should log an error when parsing a mixin with no rules', () => {
      const input = `
        Mixin: EmptyMixin
        `;
      const result = importSingleText(input, 'Empty.fsh');
      expect(result.mixins.size).toBe(1);
      const mixin = result.mixins.get('EmptyMixin');
      expect(mixin.name).toBe('EmptyMixin');
      expect(mixin.sourceInfo.location).toEqual({
        startLine: 2,
        startColumn: 9,
        endLine: 2,
        endColumn: 25
      });
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Empty\.fsh.*Line: 4\D*/s);
    });
  });
});
