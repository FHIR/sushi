import 'jest-extended';
import { Instance } from '../../src/fshtypes/Instance';

describe('Instance', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Instance('MyInstance');
      expect(p.name).toBe('MyInstance');
      expect(p.id).toBe('MyInstance');
      expect(p.instanceOf).toBeUndefined();
      expect(p.title).toBeUndefined();
      expect(p.rules).toBeEmpty();
    });
  });
});
