import 'jest-extended';
import { FshCodeSystem } from '../../src/fshtypes/FshCodeSystem';
import { ConceptRule } from '../../src/fshtypes/rules';
import { EOL } from 'os';

describe('CodeSystem', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const cs = new FshCodeSystem('MyCodeSystem');
      expect(cs.name).toBe('MyCodeSystem');
      expect(cs.id).toBe('MyCodeSystem');
      expect(cs.title).toBeUndefined();
      expect(cs.description).toBeUndefined();
      expect(cs.rules).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest CodeSystem', () => {
      const input = new FshCodeSystem('SimpleCodeSystem');

      const expectedResult = ['CodeSystem: SimpleCodeSystem', 'Id: SimpleCodeSystem'].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a CodeSystem with additional metadata', () => {
      const input = new FshCodeSystem('MetaCodeSystem');
      input.id = 'meta-code-system';
      input.title = 'Meta CodeSystem';
      input.description = 'This is a CodeSystem with some metadata.';

      const expectedResult = [
        'CodeSystem: MetaCodeSystem',
        'Id: meta-code-system',
        'Title: "Meta CodeSystem"',
        'Description: "This is a CodeSystem with some metadata."'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a CodeSystem with metadata that contains characters that are escaped in FSH', () => {
      const input = new FshCodeSystem('NewlineCodeSystem');
      input.id = 'newline-code-system';
      input.title = 'This title\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';
      input.description =
        'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

      const expectedResult = [
        'CodeSystem: NewlineCodeSystem',
        'Id: newline-code-system',
        'Title: "This title\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"',
        'Description: """This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?"""'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a CodeSystem with rules', () => {
      const input = new FshCodeSystem('MyCodeSystem');
      const conceptRule1 = new ConceptRule('foo');
      conceptRule1.display = 'bar';
      conceptRule1.definition = 'baz';
      input.rules.push(conceptRule1);
      const conceptRule2 = new ConceptRule('oof');
      conceptRule2.display = 'rab';
      conceptRule2.definition = 'zab';
      input.rules.push(conceptRule2);

      const expectedResult = [
        'CodeSystem: MyCodeSystem',
        'Id: MyCodeSystem',
        '* #foo "bar" "baz"',
        '* #oof "rab" "zab"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
