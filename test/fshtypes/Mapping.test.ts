import 'jest-extended';
import { Mapping } from '../../src/fshtypes/Mapping';
import { EOL } from 'os';
import { MappingRule } from '../../src/fshtypes/rules';

describe('Mapping', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const m = new Mapping('MyMapping');
      expect(m.name).toBe('MyMapping');
      expect(m.id).toBe('MyMapping');
      expect(m.source).toBeUndefined();
      expect(m.target).toBeUndefined();
      expect(m.description).toBeUndefined();
      expect(m.title).toBeUndefined();
      expect(m.rules).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest Mapping', () => {
      const input = new Mapping('SimpleMapping');

      const expectedResult = ['Mapping: SimpleMapping', 'Id: SimpleMapping'].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a Mapping with additional metadata', () => {
      const input = new Mapping('MetaMapping');
      input.id = 'meta-mapping';
      input.title = 'Meta Mapping';
      input.description = 'This is a Mapping with some metadata';
      input.source = 'ProfiledPatient';
      input.target = 'http://example.org';

      const expectedResult = [
        'Mapping: MetaMapping',
        'Id: meta-mapping',
        'Title: "Meta Mapping"',
        'Description: "This is a Mapping with some metadata"',
        'Source: ProfiledPatient',
        'Target: "http://example.org"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a Mapping with metadata that contains characters that are escaped in FSH', () => {
      const input = new Mapping('NewLineMapping');
      input.id = 'new-line-mapping';
      input.target = 'http://crazy\\url.com';
      input.title = 'This title\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';
      input.description =
        'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

      const expectedResult = [
        'Mapping: NewLineMapping',
        'Id: new-line-mapping',
        'Title: "This title\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"',
        'Description: """This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?"""',
        'Target: "http://crazy\\\\url.com"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for a Mapping with rules', () => {
      const input = new Mapping('MyMapping');
      const mappingRule1 = new MappingRule('foo');
      mappingRule1.map = 'bar.baz';
      input.rules.push(mappingRule1);
      const mappingRule2 = new MappingRule('oof');
      mappingRule2.map = 'rab.zab';
      input.rules.push(mappingRule2);

      const expectedResult = [
        'Mapping: MyMapping',
        'Id: MyMapping',
        '* foo -> "bar.baz"',
        '* oof -> "rab.zab"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
