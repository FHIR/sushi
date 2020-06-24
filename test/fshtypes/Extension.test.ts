import 'jest-extended';
import { Extension } from '../../src/fshtypes/Extension';
import { CardRule } from '../../src/fshtypes/rules';
import { FshConcept } from '../../src/fshtypes';

describe('Extension', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Extension('MyExtension');
      expect(p.name).toBe('MyExtension');
      expect(p.id).toBe('MyExtension');
      expect(p.parent).toBe('Extension');
      expect(p.mixins).toBeEmpty();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#ruleIsAllowed', () => {
    it('should allow a rule that is not on the disallowed list', () => {
      const e = new Extension('MyExtension');
      expect(e.ruleIsAllowed(new CardRule('foo'))).toBeTrue();
    });

    it('should not allow a rule that is on the disallowed list', () => {
      const e = new Extension('MyExtension');
      expect(e.ruleIsAllowed(new FshConcept('foo'))).toBeFalse();
    });
  });
});
