import 'jest-extended';
import { FixedValueRule } from '../../../src/fshtypes/rules/FixedValueRule';

describe('FixedValueRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new FixedValueRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.fixedValue).toBeUndefined();
      expect(c.exactly).toBeUndefined();
      expect(c.isInstance).toBeUndefined();
    });
  });
});
