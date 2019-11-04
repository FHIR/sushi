import 'jest-extended';
import { CardRule } from '../../../src/fshtypes/rules/CardRule';

describe('CardRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CardRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.min).toBeUndefined();
      expect(c.max).toBeUndefined();
    });
  });
});
