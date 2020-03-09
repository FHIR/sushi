import 'jest-extended';
import { ValueSetRule } from '../../../src/fshtypes/rules/ValueSetRule';

describe('ValueSetRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ValueSetRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.valueSet).toBeUndefined();
      expect(c.strength).toBeUndefined();
      expect(c.units).toBeUndefined();
    });
  });
});
