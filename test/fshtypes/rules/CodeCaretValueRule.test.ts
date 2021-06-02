import 'jest-extended';
import { InstanceDefinition } from '../../../src/fhirtypes';
import { FshCanonical, FshCode, FshQuantity, FshRatio, FshReference } from '../../../src/fshtypes';
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

  describe('#toFSH', () => {
    it('should produce FSH for a CodeCaretValueRule assigning a string', () => {
      const rule = new CodeCaretValueRule(['bear']);
      rule.caretPath = 'display';
      rule.value = 'Bear is "here"';

      expect(rule.toFSH()).toBe('* #bear ^display = "Bear is \\"here\\""');
    });

    it('should produce FSH for a CodeCaretValueRule assigning an instance', () => {
      const rule = new CodeCaretValueRule(['bear', 'sunbear']);
      rule.caretPath = 'contained[0]';
      rule.isInstance = true;
      rule.value = 'Foo';

      expect(rule.toFSH()).toBe('* #bear #sunbear ^contained[0] = Foo');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a boolean', () => {
      const rule = new CodeCaretValueRule(['goat']);
      rule.caretPath = 'property[0].valueBoolean';
      rule.value = false;

      expect(rule.toFSH()).toBe('* #goat ^property[0].valueBoolean = false');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a number', () => {
      const rule = new CodeCaretValueRule(['owl']);
      rule.caretPath = 'property[1].valueInteger';
      rule.value = 7;

      expect(rule.toFSH()).toBe('* #owl ^property[1].valueInteger = 7');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshCanonical', () => {
      const rule = new CodeCaretValueRule(['owl', 'barnowl']);
      rule.caretPath = 'extension.url';
      rule.value = new FshCanonical('OwlExtension');

      expect(rule.toFSH()).toBe('* #owl #barnowl ^extension.url = Canonical(OwlExtension)');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshCanonical with a version', () => {
      const rule = new CodeCaretValueRule(['owl', 'barnowl']);
      rule.caretPath = 'extension.url';
      rule.value = new FshCanonical('OwlExtension');
      rule.value.version = '1.2.3';

      expect(rule.toFSH()).toBe('* #owl #barnowl ^extension.url = Canonical(OwlExtension|1.2.3)');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshCode with just a code', () => {
      const rule = new CodeCaretValueRule(['shark']);
      rule.caretPath = 'property[0].valueCode';
      rule.value = new FshCode('rough');

      expect(rule.toFSH()).toBe('* #shark ^property[0].valueCode = #rough');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshCode with a code and system', () => {
      const rule = new CodeCaretValueRule(['shark']);
      rule.caretPath = 'property[0].valueCode';
      rule.value = new FshCode('rough', 'http://example.com');

      expect(rule.toFSH()).toBe('* #shark ^property[0].valueCode = http://example.com#rough');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshCode with a code, system, and display', () => {
      const rule = new CodeCaretValueRule(['shark']);
      rule.caretPath = 'property[0].valueCode';
      rule.value = new FshCode('rough', 'http://example.com', 'rough skin');

      expect(rule.toFSH()).toBe(
        '* #shark ^property[0].valueCode = http://example.com#rough "rough skin"'
      );
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshQuantity', () => {
      const rule = new CodeCaretValueRule(['crocodile']);
      rule.caretPath = 'extension[0].value[x].maxValueQuantity';
      rule.value = new FshQuantity(15);

      expect(rule.toFSH()).toBe('* #crocodile ^extension[0].value[x].maxValueQuantity = 15');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshQuantity with a unit', () => {
      const rule = new CodeCaretValueRule(['crocodile']);
      rule.caretPath = 'extension[0].value[x].maxValueQuantity';
      const meters = new FshCode('m', 'http://unitsofmeasure.org');
      rule.value = new FshQuantity(15, meters);

      expect(rule.toFSH()).toBe("* #crocodile ^extension[0].value[x].maxValueQuantity = 15 'm'");
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshQuantity with a non-UCUM system', () => {
      const rule = new CodeCaretValueRule(['crocodile']);
      rule.caretPath = 'extension[0].value[x].maxValueQuantity';
      const meters = new FshCode('m', 'http://otherunits.org', 'meters');
      rule.value = new FshQuantity(15, meters);

      expect(rule.toFSH()).toBe(
        '* #crocodile ^extension[0].value[x].maxValueQuantity = 15 http://otherunits.org#m "meters"'
      );
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshRatio', () => {
      const rule = new CodeCaretValueRule(['alligator']);
      rule.caretPath = 'extension[0].value[x].patternRatio';
      const numerator = new FshQuantity(130);
      const denominator = new FshQuantity(1);
      rule.value = new FshRatio(numerator, denominator);

      expect(rule.toFSH()).toBe('* #alligator ^extension[0].value[x].patternRatio = 130 : 1');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshRatio with units', () => {
      const rule = new CodeCaretValueRule(['alligator']);
      rule.caretPath = 'extension[0].value[x].patternRatio';
      const mg = new FshCode('mg', 'http://unitsofmeasure.org');
      const numerator = new FshQuantity(130, mg);
      const dL = new FshCode('dL', 'http://unitsofmeasure.org');
      const denominator = new FshQuantity(1, dL);
      rule.value = new FshRatio(numerator, denominator);

      expect(rule.toFSH()).toBe(
        "* #alligator ^extension[0].value[x].patternRatio = 130 'mg' : 1 'dL'"
      );
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshReference', () => {
      const rule = new CodeCaretValueRule(['leopard']);
      rule.caretPath = 'url';
      rule.value = new FshReference('Example');

      expect(rule.toFSH()).toBe('* #leopard ^url = Reference(Example)');
    });

    it('should produce FSH for a CodeCaretValueRule assigning a FshReference with display', () => {
      const rule = new CodeCaretValueRule(['leopard']);
      rule.caretPath = 'url';
      rule.value = new FshReference('Example', 'My Example');

      expect(rule.toFSH()).toBe('* #leopard ^url = Reference(Example) "My Example"');
    });

    it('should produce FSH for a CodeCaretValueRule assigning an InstanceDefinition', () => {
      const rule = new CodeCaretValueRule(['corvid']);
      rule.caretPath = 'contact';
      rule.value = new InstanceDefinition();
      rule.value._instanceMeta.name = 'MyContact';

      expect(rule.toFSH()).toBe('* #corvid ^contact = MyContact');
    });
  });
});
