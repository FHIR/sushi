import 'jest-extended';
import { ContainsRule } from '../../../src/fshtypes/rules/ContainsRule';

describe('ContainsRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ContainsRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.items.length).toBe(0);
    });
  });
});
