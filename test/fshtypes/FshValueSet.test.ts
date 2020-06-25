import 'jest-extended';
import { FshValueSet } from '../../src/fshtypes/FshValueSet';

describe('ValueSet', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const vs = new FshValueSet('MyValueSet');
      expect(vs.name).toBe('MyValueSet');
      expect(vs.id).toBe('MyValueSet');
      expect(vs.title).toBeUndefined();
      expect(vs.description).toBeUndefined();
      expect(vs.rules).toBeEmpty();
    });
  });
});
