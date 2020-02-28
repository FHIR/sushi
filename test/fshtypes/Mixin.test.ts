import 'jest-extended';
import { Mixin } from '../../src/fshtypes/Mixin';

describe('Mixin', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const m = new Mixin('MyMixin');
      expect(m.name).toBe('MyMixin');
      expect(m.rules).toBeEmpty();
    });
  });
});
