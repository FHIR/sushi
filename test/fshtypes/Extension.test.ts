import 'jest-extended';
import { Extension } from '../../src/fshtypes/Extension';
import { EOL } from 'os';
import { BindingRule, ObeysRule, CardRule, FlagRule } from '../../src/fshtypes/rules';

describe('Extension', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const p = new Extension('MyExtension');
      expect(p.name).toBe('MyExtension');
      expect(p.id).toBe('MyExtension');
      expect(p.parent).toBe('Extension');
      expect(p.mixins).toBeEmpty();
      expect(p.rules).toBeEmpty();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for the simplest extension', () => {
      const input = new Extension('SimpleExtension');

      const expectedResult = [
        'Extension: SimpleExtension',
        'Parent: Extension',
        'Id: SimpleExtension'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an extension with additional metadata', () => {
      const input = new Extension('MyExtension');
      input.parent = 'Extension';
      input.id = 'my-extension';
      input.title = 'My Extension';
      input.description = 'My extension is not very extensive.';

      const expectedResult = [
        'Extension: MyExtension',
        'Parent: Extension',
        'Id: my-extension',
        'Title: "My Extension"',
        'Description: "My extension is not very extensive."'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });

    it('should produce FSH for an extension with rules', () => {
      const input = new Extension('MyExtension');

      const cardRule = new CardRule('extension');
      cardRule.min = 0;
      cardRule.max = '0';
      input.rules.push(cardRule);

      const flagRule = new FlagRule('value[x]');
      flagRule.mustSupport = true;
      flagRule.summary = true;
      input.rules.push(flagRule);

      const bindingRule = new BindingRule('value[x]');
      bindingRule.valueSet = 'http://example.org/ValueSet/Foo';
      bindingRule.strength = 'required';
      input.rules.push(bindingRule);

      const obeysRule = new ObeysRule('.');
      obeysRule.invariant = 'myx-1';
      input.rules.push(obeysRule);

      const expectedResult = [
        'Extension: MyExtension',
        'Parent: Extension',
        'Id: MyExtension',
        '* extension 0..0',
        '* value[x] MS SU',
        '* value[x] from http://example.org/ValueSet/Foo (required)',
        '* obeys myx-1'
      ].join(EOL);
      const result = input.toFSH();
      expect(result).toBe(expectedResult);
    });
  });
});
