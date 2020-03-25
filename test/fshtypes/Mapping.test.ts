import 'jest-extended';
import { Mapping } from '../../src/fshtypes/Mapping';

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
});
