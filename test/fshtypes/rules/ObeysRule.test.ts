import 'jest-extended';
import { ObeysRule } from '../../../src/fshtypes/rules/ObeysRule';

describe('ObeysRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ObeysRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.invariant).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for an ObeysRule on a non-root element', () => {
      const rule = new ObeysRule('component');
      rule.invariant = 'FSH-1';

      expect(rule.toFSH()).toBe('* component obeys FSH-1');
    });

    it('should produce FSH for an ObeysRule on the root element', () => {
      const rule = new ObeysRule('.');
      rule.invariant = 'FSH-5';

      expect(rule.toFSH()).toBe('* obeys FSH-5');
    });
  });
});
