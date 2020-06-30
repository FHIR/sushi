import 'jest-extended';
import { ConceptRule } from '../../../src/fshtypes/rules/ConceptRule';

describe('ConceptRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new ConceptRule('foo', 'bar', 'baz');
      expect(c.path).toBe('');
      expect(c.code).toBe('foo');
      expect(c.display).toBe('bar');
      expect(c.definition).toBe('baz');
    });
  });
});
