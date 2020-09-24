import 'jest-extended';
import { BindingRule } from '../../../src/fshtypes/rules/BindingRule';

describe('BindingRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new BindingRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.valueSet).toBeUndefined();
      expect(c.strength).toBeUndefined();
    });
  });
});
