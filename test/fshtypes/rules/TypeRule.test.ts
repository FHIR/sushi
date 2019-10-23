import 'jest-extended';
import { TypeRule, TYPE_RULE_TYPE } from '../../../src/fshtypes/rules/TypeRule';

describe('TypeRule', () => {
  describe('#TYPE_RULE_TYPE', () => {
    it('should export correct constant type string', () => {
      expect(TYPE_RULE_TYPE).toBe('type');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const t = new TypeRule('component.code');
      expect(t.ruleType).toBe('type');
      expect(t.path).toBe('component.code');
      expect(t.types).toBeEmpty();
      expect(t.only).toBeUndefined();
    });
  });
});
