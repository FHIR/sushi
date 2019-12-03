import 'jest-extended';
import { CaretValueRule } from '../../../src/fshtypes/rules/CaretValueRule';

describe('CaretValueRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CaretValueRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.caretPath).toBeUndefined();
      expect(c.value).toBeUndefined();
    });
  });
});
