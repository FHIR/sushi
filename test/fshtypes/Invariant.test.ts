import 'jest-extended';
import { Invariant, FshCode } from '../../src/fshtypes';
import { AssignmentRule } from '../../src/fshtypes/rules';
import { EOL } from 'os';

describe('Invariant', () => {
  describe('#constructor', () => {
    it('should set initial properties correctly', () => {
      const invariant = new Invariant('MyInvariant');
      expect(invariant.name).toBe('MyInvariant');
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
      input.description = 'This is an important condition.';
      input.severity = new FshCode('error');
      input.expression = 'requirement.exists()';
      input.xpath = 'f:requirement';

      const expectedResult = [
        'Invariant: inv-2',
        'Description: "This is an important condition."',
        '* severity = #error',
        '* expression = "requirement.exists()"',
        '* xpath = "f:requirement"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an invariant with metadata that contains characters that are escaped in FSH', () => {
      const input = new Invariant('inv-3');
      input.description = 'Please do this.\nPlease always do this with a \\ character.';
      input.severity = new FshCode('warning');
      input.expression = 'requirement.contains("\\")';
      input.xpath = 'f:requirement';

      const expectedResult = [
        'Invariant: inv-3',
        'Description: """Please do this.\nPlease always do this with a \\ character."""',
        '* severity = #warning',
        '* expression = "requirement.contains(\\"\\\\\\")"',
        '* xpath = "f:requirement"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an invariant with additional rules', () => {
      const input = new Invariant('inv-4');
      input.description = 'This is an important condition.';
      input.severity = new FshCode('error');
      input.expression = 'requirement.exists()';
      input.xpath = 'f:requirement';

      const requirements = new AssignmentRule('requirements');
      requirements.value = 'This is necessary because it is important.';
      const extensionUrl = new AssignmentRule('human.extension[0].url');
      extensionUrl.value = 'http://example.org/SomeExtension';
      const extensionValue = new AssignmentRule('human.extension[0].valueString');
      extensionValue.value = 'ExtensionValue';
      input.rules.push(requirements, extensionUrl, extensionValue);

      const expectedResult = [
        'Invariant: inv-4',
        'Description: "This is an important condition."',
        '* severity = #error',
        '* expression = "requirement.exists()"',
        '* xpath = "f:requirement"',
        '* requirements = "This is necessary because it is important."',
        '* human.extension[0].url = "http://example.org/SomeExtension"',
        '* human.extension[0].valueString = "ExtensionValue"'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
