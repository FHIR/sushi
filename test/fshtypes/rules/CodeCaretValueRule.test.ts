import 'jest-extended';
import { CodeCaretValueRule } from '../../../src/fshtypes/rules/CodeCaretValueRule';

describe('CodeCaretValueRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CodeCaretValueRule(['first', 'another']);
      expect(c.path).toBe('');
      expect(c.codePath).toEqual(['first', 'another']);
      expect(c.caretPath).toBeUndefined();
      expect(c.value).toBeUndefined();
      expect(c.isInstance).toBeUndefined();
    });
  });
});
