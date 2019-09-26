import 'jest-extended';
import { Extension } from '../src/Extension';

describe('Extension', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Extension('MyExtension');
      expect(p.name).toBe('MyExtension');
      expect(p.id).toBe('MyExtension');
      expect(p.parent).toBeUndefined();
      expect(p.rules).toBeEmpty();
    });
  });
});
