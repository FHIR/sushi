import 'jest-extended';
import { RuleSet } from '../../src/fshtypes/RuleSet';

describe('RuleSet', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new RuleSet('MyRuleSet');
      expect(r.name).toBe('MyRuleSet');
      expect(r.rules).toBeEmpty();
    });
  });
});
