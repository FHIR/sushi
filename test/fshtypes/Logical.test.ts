import 'jest-extended';
import { Logical } from '../../src/fshtypes/';
describe('Logical', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const l = new Logical('MyLogical');
      expect(l.name).toBe('MyLogical');
      expect(l.id).toBe('MyLogical');
      expect(l.parent).toBe('Base');
      expect(l.title).toBeUndefined();
      expect(l.description).toBeUndefined();
      expect(l.rules).toBeEmpty();
    });

    it('should get the correct constructor name', () => {
      const l = new Logical('MyLogical');
      expect(l.constructorName).toBe('Logical');
    });
  });
});
