import 'jest-extended';
import { MappingRule } from '../../../src/fshtypes/rules/MappingRule';
import { FshCode } from '../../../src/fshtypes';

describe('MappingRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const m = new MappingRule('identifier');
      expect(m.path).toBe('identifier');
      expect(m.map).toBeUndefined();
      expect(m.language).toBeUndefined();
      expect(m.comment).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a basic MappingRule', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.otherIdentifier';

      expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier"');
    });

    it('should produce FSH for a MappingRule with no path', () => {
      const rule = new MappingRule('');
      rule.map = 'Patient';

      expect(rule.toFSH()).toBe('* -> "Patient"');
    });

    it('should produce FSH for a MappingRule with a comment', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.otherIdentifier';
      rule.comment = 'This is a comment';

      expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier" "This is a comment"');
    });

    it('should produce FSH for a MappingRule with a language', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.otherIdentifier';
      rule.language = new FshCode('lang');

      expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier" #lang');
    });

    it('should produce FSH for a MappingRule with a comment and target', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.otherIdentifier';
      rule.comment = 'This is a comment';
      rule.language = new FshCode('lang');

      expect(rule.toFSH()).toBe(
        '* identifier -> "Patient.otherIdentifier" "This is a comment" #lang'
      );
    });

    it('should produce FSH for a MappingRule with a map that contains characters that are escaped in FSH', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.\\somethingFu\nnky';

      expect(rule.toFSH()).toBe('* identifier -> "Patient.\\\\somethingFu\\nnky"');
    });

    it('should produce FSH for a MappingRule with a comment that contains characters that are escaped in FSH', () => {
      const rule = new MappingRule('identifier');
      rule.map = 'Patient.otherIdentifier';
      rule.comment = 'This has a \n newline, which is pretty \\wild.';

      expect(rule.toFSH()).toBe(
        '* identifier -> "Patient.otherIdentifier" "This has a \\n newline, which is pretty \\\\wild."'
      );
    });
  });
});
