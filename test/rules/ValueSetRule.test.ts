import 'jest-extended';
import {
  ValueSetRule,
  VALUE_SET_RULE_TYPE
} from '../../src/rules/ValueSetRule';

describe('ValueSetRule', () => {
  describe('#VALUESET_RULE_TYPE', () => {
    it('should export correct constant type string', () => {
      expect(VALUE_SET_RULE_TYPE).toBe('valueset');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ValueSetRule('component.code');
      expect(c.ruleType).toBe('valueset');
      expect(c.path).toBe('component.code');
      expect(c.valueSet).toBeUndefined();
      expect(c.strength).toBeUndefined();
    });
  });
});
