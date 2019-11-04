import 'jest-extended';
import { FixedValueRule, FIXED_VALUE_RULE_TYPE } from '../../../src/fshtypes/rules/FixedValueRule';

describe('FixedValueRule', () => {
  describe('#FIXED_VALUE_RULE_TYPE', () => {
    it('should export correct constant type string', () => {
      expect(FIXED_VALUE_RULE_TYPE).toBe('fixedvalue');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new FixedValueRule('component.code');
      expect(c.ruleType).toBe('fixedvalue');
      expect(c.path).toBe('component.code');
      expect(c.fixedValue).toBeUndefined();
    });
  });
});
