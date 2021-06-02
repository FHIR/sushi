import 'jest-extended';
import { Resource } from '../../src/fshtypes/';
describe('Resource', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const r = new Resource('MyResource');
      expect(r.name).toBe('MyResource');
      expect(r.id).toBe('MyResource');
      expect(r.parent).toBe('DomainResource');
      expect(r.title).toBeUndefined();
      expect(r.description).toBeUndefined();
      expect(r.rules).toBeEmpty();
    });

    it('should get the correct constructor name', () => {
      const r = new Resource('MyResource');
      expect(r.constructorName).toBe('Resource');
    });
  });
});
