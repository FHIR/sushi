import 'jest-extended';
import { Instance } from '../../src/fshtypes/Instance';
import { FixedValueRule, CardRule } from '../../src/fshtypes/rules';

describe('Instance', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Instance('MyInstance');
      expect(p.name).toBe('MyInstance');
      expect(p.id).toBe('MyInstance');
      expect(p.instanceOf).toBeUndefined();
      expect(p.title).toBeUndefined();
      expect(p.mixins).toBeEmpty();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is on the allowed list', () => {
      const i = new Instance('MyInstance');
      expect(i.ruleIsAllowed(new FixedValueRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is not on the allowed list', () => {
      const i = new Instance('MyInstance');
      expect(i.ruleIsAllowed(new CardRule('foo'))).toBeFalse();
    });
  });
});
