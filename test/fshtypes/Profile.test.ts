import 'jest-extended';
import { Profile } from '../../src/fshtypes/Profile';

describe('Profile', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Profile('MyProfile');
      expect(p.name).toBe('MyProfile');
      expect(p.id).toBe('MyProfile');
      expect(p.parent).toBeUndefined();
      expect(p.rules).toBeEmpty();
    });
  });
});
