import 'jest-extended';
import { Mapping } from '../../src/fshtypes/Mapping';
import { MappingRule, CardRule } from '../../src/fshtypes/rules';

describe('Mapping', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const m = new Mapping('MyMapping');
      expect(m.name).toBe('MyMapping');
      expect(m.id).toBe('MyMapping');
      expect(m.source).toBeUndefined();
      expect(m.target).toBeUndefined();
      expect(m.description).toBeUndefined();
      expect(m.title).toBeUndefined();
      expect(m.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is on the allowed list', () => {
      const m = new Mapping('MyMapping');
      expect(m.ruleIsAllowed(new MappingRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is not on the allowed list', () => {
      const m = new Mapping('MyMapping');
      expect(m.ruleIsAllowed(new CardRule('foo'))).toBeFalse();
    });
  });
});
