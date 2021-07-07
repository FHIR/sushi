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
      expect(c.hierarchy).toHaveLength(0);
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a ConceptRule with only code', () => {
      const rule = new ConceptRule('foo');

      const expectedResult = '* #foo';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with code and display', () => {
      const rule = new ConceptRule('foo');
      rule.display = 'bar';

      const expectedResult = '* #foo "bar"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with code, display, and definition', () => {
      const rule = new ConceptRule('foo');
      rule.display = 'bar';
      rule.definition = 'baz';

      const expectedResult = '* #foo "bar" "baz"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with code and definition', () => {
      const rule = new ConceptRule('foo');
      rule.definition = 'baz';

      const expectedResult = '* #foo """baz"""';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with display and definition that contain characters that are escaped in FSH', () => {
      const rule = new ConceptRule('foo');
      rule.display = 'bar is "important" \\really\\';
      rule.definition = 'baz is "pretend" \\but not really\\';

      const expectedResult =
        '* #foo "bar is \\"important\\" \\\\really\\\\" "baz is \\"pretend\\" \\\\but not really\\\\"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with a code that has spaces', () => {
      const rule = new ConceptRule('foo with a space');
      rule.display = 'bar';
      rule.definition = 'baz';

      const expectedResult = '* #"foo with a space" "bar" "baz"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with a code that has tabs', () => {
      const rule = new ConceptRule('foo\twith\ta\ttab');
      rule.display = 'bar';
      rule.definition = 'baz';

      const expectedResult = '* #"foo\twith\ta\ttab" "bar" "baz"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with one code in its hierarchy', () => {
      const rule = new ConceptRule('platinum');
      rule.display = 'platinum';
      rule.definition = 'element with atomic number 78';
      rule.hierarchy = ['metal'];

      const expectedResult = '* #metal #platinum "platinum" "element with atomic number 78"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a ConceptRule with multiple codes in its hierarchy', () => {
      const rule = new ConceptRule('platinum');
      rule.display = 'platinum';
      rule.definition = 'element with atomic number 78';
      rule.hierarchy = ['physical', 'solid phase', 'metal'];

      const expectedResult =
        '* #physical #"solid phase" #metal #platinum "platinum" "element with atomic number 78"';
      const result = rule.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
