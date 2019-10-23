import 'jest-extended';
import { CardRule, CARD_RULE_TYPE } from '../../../src/fshtypes/rules/CardRule';

describe('CardRule', () => {
  describe('#CARD_RULE_TYPE', () => {
    it('should export correct constant type string', () => {
      expect(CARD_RULE_TYPE).toBe('card');
    });
  });

  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CardRule('component.code');
      expect(c.ruleType).toBe('card');
      expect(c.path).toBe('component.code');
      expect(c.min).toBeUndefined();
      expect(c.max).toBeUndefined();
    });
  });
});
