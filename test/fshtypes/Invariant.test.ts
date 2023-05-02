import 'jest-extended';
import { Invariant, FshCode } from '../../src/fshtypes';
import { EOL } from 'os';

describe('Invariant', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const invariant = new Invariant('MyInvariant');
      expect(invariant.name).toBe('MyInvariant');
      expect(invariant.requirements).toBeUndefined();
      expect(invariant.description).toBeUndefined();
      expect(invariant.expression).toBeUndefined();
      expect(invariant.xpath).toBeUndefined();
      expect(invariant.severity).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest invariant', () => {
      const input = new Invariant('inv-1');

      const expectedResult = 'Invariant: inv-1';
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an invariant with additional metadata', () => {
      const input = new Invariant('inv-2');
      input.requirements = 'There are certain requirements for this condition.';
      input.description = 'This is an important condition.';
      input.severity = new FshCode('error');
      input.expression = 'requirement.exists()';
      input.xpath = 'f:requirement';

      const expectedResult = [
        'Invariant: inv-2',
        'Requirements: "There are certain requirements for this condition."',
        'Description: "This is an important condition."',
        'Severity: #error',
        'Expression: "requirement.exists()"',
        'XPath: "f:requirement"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an invariant with metadata that contains characters that are escaped in FSH', () => {
      const input = new Invariant('inv-3');
      input.requirements =
        'There are certain requirements for this condition:\n* Use a newline.\n* That is all.';
      input.description = 'Please do this.\nPlease always do this with a \\ character.';
      input.severity = new FshCode('warning');
      input.expression = 'requirement.contains("\\")';
      input.xpath = 'f:requirement';

      const expectedResult = [
        'Invariant: inv-3',
        'Requirements: """There are certain requirements for this condition:\n* Use a newline.\n* That is all."""',
        'Description: """Please do this.\nPlease always do this with a \\ character."""',
        'Severity: #warning',
        'Expression: "requirement.contains(\\"\\\\\\")"',
        'XPath: "f:requirement"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
