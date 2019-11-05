import 'jest-extended';
import { FlagRule } from '../../../src/fshtypes/rules/FlagRule';

describe('FlagRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const f = new FlagRule('component.code');
      expect(f.path).toBe('component.code');
      expect(f.mustSupport).toBeUndefined();
      expect(f.summary).toBeUndefined();
      expect(f.modifier).toBeUndefined();
    });
  });
});
