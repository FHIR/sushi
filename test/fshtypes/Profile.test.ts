import 'jest-extended';
import { Profile } from '../../src/fshtypes/Profile';
import { CardRule, ConceptRule } from '../../src/fshtypes/rules';
describe('Profile', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Profile('MyProfile');
      expect(p.name).toBe('MyProfile');
      expect(p.id).toBe('MyProfile');
      expect(p.parent).toBeUndefined();
      expect(p.mixins).toBeEmpty();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is not on the disallowed list', () => {
      const p = new Profile('MyProfile');
      expect(p.ruleIsAllowed(new CardRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is on the disallowed list', () => {
      const p = new Profile('MyProfile');
      expect(p.ruleIsAllowed(new ConceptRule('foo'))).toBeFalse();
    });
  });
});
