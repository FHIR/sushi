import 'jest-extended';
import { RuleSet } from '../../src/fshtypes/RuleSet';
import { CardRule, InsertRule } from '../../src/fshtypes/rules';

describe('RuleSet', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new RuleSet('MyRuleSet');
      expect(r.name).toBe('MyRuleSet');
      expect(r.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is not on the disallowed list', () => {
      const r = new RuleSet('MyRuleSet');
      expect(r.ruleIsAllowed(new CardRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is on the disallowed list', () => {
      const r = new RuleSet('MyRuleSet');
      expect(r.ruleIsAllowed(new InsertRule())).toBeFalse();
    });
  });
});
