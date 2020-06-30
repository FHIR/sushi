import 'jest-extended';
import { ValueSetComponentRule } from '../../../src/fshtypes/rules/ValueSetComponentRule';

describe('ValueSetComponentRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const v = new ValueSetComponentRule(true);
      expect(v.inclusion).toBeTrue();
      expect(v.from).toEqual({});
    });
  });
});
