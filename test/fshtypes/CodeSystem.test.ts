import 'jest-extended';
import { CodeSystem } from '../../src/fshtypes/CodeSystem';

describe('CodeSystem', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const cs = new CodeSystem('MyCodeSystem');
      expect(cs.name).toBe('MyCodeSystem');
      expect(cs.id).toBe('MyCodeSystem');
      expect(cs.title).toBeUndefined();
      expect(cs.description).toBeUndefined();
      expect(cs.concepts).toBeEmpty();
    });
  });
});
