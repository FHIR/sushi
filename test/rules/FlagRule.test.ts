import 'jest-extended';
import { FlagRule, FLAG_RULE_TYPE } from '../../src/rules/FlagRule';

describe('FlagRule', () => {
  describe('#FLAG_RULE_TYPE', () => {
    it('should export correct constant type string', () => {
      expect(FLAG_RULE_TYPE).toBe('flag');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const f = new FlagRule('component.code');
      expect(f.ruleType).toBe('flag');
      expect(f.path).toBe('component.code');
      expect(f.mustSupport).toBeUndefined();
    });
  });
});
