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

  describe('#toFSH', () => {
    it('should produce FSH for a BindingRule', () => {
      const rule = new BindingRule('valueCodeableConcept');
      rule.valueSet = 'http://example.org/ValueSet/Foo';
      rule.strength = 'required';

      const expectedResult =
        '* valueCodeableConcept from http://example.org/ValueSet/Foo (required)';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
