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
});
