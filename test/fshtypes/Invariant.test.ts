import 'jest-extended';
import { Invariant } from '../../src/fshtypes/Invariant';

describe('Invariant', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const invariant = new Invariant('MyInvariant');
      expect(invariant.name).toBe('MyInvariant');
      expect(invariant.description).toBeUndefined();
      expect(invariant.expression).toBeUndefined();
      expect(invariant.xpath).toBeUndefined();
      expect(invariant.severity).toBeUndefined();
    });
  });
});
