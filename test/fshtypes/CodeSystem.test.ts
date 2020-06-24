import 'jest-extended';
import { FshCodeSystem } from '../../src/fshtypes/FshCodeSystem';
import { CardRule, ConceptRule } from '../../src/fshtypes/rules';

describe('CodeSystem', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const cs = new FshCodeSystem('MyCodeSystem');
      expect(cs.name).toBe('MyCodeSystem');
      expect(cs.id).toBe('MyCodeSystem');
      expect(cs.title).toBeUndefined();
      expect(cs.description).toBeUndefined();
      expect(cs.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is on the allowed list', () => {
      const cs = new FshCodeSystem('MyCodeSystem');
      expect(cs.ruleIsAllowed(new ConceptRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is not on the allowed list', () => {
      const cs = new FshCodeSystem('MyCodeSystem');
      expect(cs.ruleIsAllowed(new CardRule('foo'))).toBeFalse();
    });
  });
});
