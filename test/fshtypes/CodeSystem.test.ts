import 'jest-extended';
import { FshCodeSystem } from '../../src/fshtypes/FshCodeSystem';

describe('CodeSystem', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const cs = new FshCodeSystem('MyCodeSystem');
      expect(cs.name).toBe('MyCodeSystem');
      expect(cs.id).toBe('MyCodeSystem');
      expect(cs.title).toBeUndefined();
      expect(cs.description).toBeUndefined();
      expect(cs.concepts).toBeEmpty();
      expect(cs.rules).toBeEmpty();
    });
  });
});
