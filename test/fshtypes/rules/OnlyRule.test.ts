import 'jest-extended';
import { OnlyRule, ONLY_RULE_TYPE } from '../../../src/fshtypes/rules/OnlyRule';

describe('OnlyRule', () => {
  describe('#ONLY_RULE_TYPE', () => {
    it('should export correct constant only string', () => {
      expect(ONLY_RULE_TYPE).toBe('only');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const t = new OnlyRule('component.code');
      expect(t.ruleType).toBe('only');
      expect(t.path).toBe('component.code');
      expect(t.types).toBeEmpty();
    });
  });
});
