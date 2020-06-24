import 'jest-extended';
import { FshValueSet } from '../../src/fshtypes/FshValueSet';
import { CardRule, ValueSetComponentRule } from '../../src/fshtypes/rules';

describe('ValueSet', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const vs = new FshValueSet('MyValueSet');
      expect(vs.name).toBe('MyValueSet');
      expect(vs.id).toBe('MyValueSet');
      expect(vs.title).toBeUndefined();
      expect(vs.description).toBeUndefined();
      expect(vs.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is on the allowed list', () => {
      const vs = new FshValueSet('MyValueSet');
      expect(vs.ruleIsAllowed(new ValueSetComponentRule(true))).toBeTrue();
    });

    it('should not allow a rule that is not on the allowed list', () => {
      const vs = new FshValueSet('MyValueSet');
      expect(vs.ruleIsAllowed(new CardRule('foo'))).toBeFalse();
    });
  });
});
