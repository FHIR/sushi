import 'jest-extended';
import { CaretValueRule } from '../../../src/fshtypes/rules/CaretValueRule';
import { InstanceDefinition } from '../../../src/fhirtypes';
import { FshCanonical, FshCode, FshQuantity, FshRatio, FshReference } from '../../../src/fshtypes';

describe('CaretValueRule', () => {
  describe('#constructor', () => {
    it('should set the properties correctly', () => {
      const c = new CaretValueRule('component.code');
      expect(c.path).toBe('component.code');
      expect(c.caretPath).toBeUndefined();
      expect(c.value).toBeUndefined();
    });
  });

  describe('#toFSH', () => {
    it('should produce FSH for a CaretValueRule assigning a string', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'short';
      rule.value = 'Important "value" summary';

      expect(rule.toFSH()).toBe('* ^short = "Important \\"value\\" summary"');
    });

    it('should produce FSH for a CaretValueRule assigning an instance', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'contained[0]';
      rule.isInstance = true;
      rule.value = 'Foo';

      expect(rule.toFSH()).toBe('* ^contained[0] = Foo');
    });

    it('should produce FSH for a CaretValueRule with a path', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'definition';
      rule.value = 'This is the value';

      expect(rule.toFSH()).toBe('* value[x] ^definition = "This is the value"');
    });

    it('should produce FSH for a CaretValueRule at root path', () => {
      const rule = new CaretValueRule('.');
      rule.caretPath = 'short';
      rule.value = 'Another important summary.';

      expect(rule.toFSH()).toBe('* . ^short = "Another important summary."');
    });

    it('should produce FSH for a CaretValueRule assigning a boolean', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'abstract';
      rule.value = false;

      expect(rule.toFSH()).toBe('* ^abstract = false');
    });

    it('should produce FSH for a CaretValueRule assigning a number', () => {
      const rule = new CaretValueRule('component');
      rule.caretPath = 'min';
      rule.value = 1;

      expect(rule.toFSH()).toBe('* component ^min = 1');
    });

    it('should produce FSH for a CaretValueRule assigning a FshCanonical', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'url';
      rule.value = new FshCanonical('Observation');

      expect(rule.toFSH()).toBe('* ^url = Canonical(Observation)');
    });

    it('should produce FSH for a CaretValueRule assigning a FshCanonical with a version', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'url';
      rule.value = new FshCanonical('Example');
      rule.value.version = '1.2.3';

      expect(rule.toFSH()).toBe('* ^url = Canonical(Example|1.2.3)');
    });

    it('should produce FSH for a CaretValueRule assigning a FshCode with just a code', () => {
      const rule = new CaretValueRule('component');
      rule.caretPath = 'slicing.rules';
      rule.value = new FshCode('open');

      expect(rule.toFSH()).toBe('* component ^slicing.rules = #open');
    });

    it('should produce FSH for a CaretValueRule assigning a FshCode with a code and system', () => {
      const rule = new CaretValueRule('component');
      rule.caretPath = 'slicing.rules';
      rule.value = new FshCode('open', 'http://foo.com');

      expect(rule.toFSH()).toBe('* component ^slicing.rules = http://foo.com#open');
    });

    it('should produce FSH for a CaretValueRule assigning a FshCode with a code, system, and display', () => {
      const rule = new CaretValueRule('component');
      rule.caretPath = 'slicing.rules';
      rule.value = new FshCode('open', 'http://foo.com', 'Display Text');

      expect(rule.toFSH()).toBe('* component ^slicing.rules = http://foo.com#open "Display Text"');
    });

    it('should produce FSH for a CaretValueRule assigning a FshQuantity', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'maxValueQuantity';
      rule.value = new FshQuantity(15);

      expect(rule.toFSH()).toBe('* value[x] ^maxValueQuantity = 15');
    });

    it('should produce FSH for a CaretValueRule assigning a FshQuantity with a unit', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'maxValueQuantity';
      const mm = new FshCode('mm', 'http://unitsofmeasure.org');
      rule.value = new FshQuantity(15, mm);

      expect(rule.toFSH()).toBe("* value[x] ^maxValueQuantity = 15 'mm'");
    });

    it('should produce FSH for a CaretValueRule assigning a FshQuantity with a non-UCUM system', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'maxValueQuantity';
      const mm = new FshCode('mm', 'http://otherunits.org', 'millimeters');
      rule.value = new FshQuantity(15, mm);

      expect(rule.toFSH()).toBe(
        '* value[x] ^maxValueQuantity = 15 http://otherunits.org#mm "millimeters"'
      );
    });

    it('should produce FSH for a CaretValueRule assigning a FshRatio', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'patternRatio';
      const numerator = new FshQuantity(130);
      const denominator = new FshQuantity(1);
      rule.value = new FshRatio(numerator, denominator);

      expect(rule.toFSH()).toBe('* value[x] ^patternRatio = 130 : 1');
    });

    it('should produce FSH for a CaretValueRule assigning a FshRatio with units', () => {
      const rule = new CaretValueRule('value[x]');
      rule.caretPath = 'patternRatio';
      const mg = new FshCode('mg', 'http://unitsofmeasure.org');
      const numerator = new FshQuantity(130, mg);
      const dL = new FshCode('dL', 'http://unitsofmeasure.org');
      const denominator = new FshQuantity(1, dL);
      rule.value = new FshRatio(numerator, denominator);

      expect(rule.toFSH()).toBe("* value[x] ^patternRatio = 130 'mg' : 1 'dL'");
    });

    it('should produce FSH for a CaretValueRule assigning a FshReference', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'url';
      rule.value = new FshReference('Example');

      expect(rule.toFSH()).toBe('* ^url = Reference(Example)');
    });

    it('should produce FSH for a CaretValueRule assigning a FshReference with display', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'url';
      rule.value = new FshReference('Example', 'My Example');

      expect(rule.toFSH()).toBe('* ^url = Reference(Example) "My Example"');
    });

    it('should produce FSH for a CaretValueRule assigning an InstanceDefinition', () => {
      const rule = new CaretValueRule('');
      rule.caretPath = 'contact';
      rule.value = new InstanceDefinition();
      rule.value._instanceMeta.name = 'MyContact';

      expect(rule.toFSH()).toBe('* ^contact = MyContact');
    });

    it('should produce FSH for a CaretValueRule with isCodeCaretRule assigning a string', () => {
      const rule = new CaretValueRule('');
      rule.pathArray = ['bear'];
      rule.isCodeCaretRule = true;
      rule.caretPath = 'display';
      rule.value = 'Bear is "here"';

      expect(rule.toFSH()).toBe('* #bear ^display = "Bear is \\"here\\""');
    });

    it('should produce FSH for a nested CaretValueRule with isCodeCaretRule assigning a FshCanonical', () => {
      const rule = new CaretValueRule('');
      rule.pathArray = ['owl', 'barnowl'];
      rule.isCodeCaretRule = true;
      rule.caretPath = 'extension.url';
      rule.value = new FshCanonical('OwlExtension');

      expect(rule.toFSH()).toBe('* #owl #barnowl ^extension.url = Canonical(OwlExtension)');
    });

    it('should produce FSH for CaretValueRule with isCodeCaretRule and no path', () => {
      const rule = new CaretValueRule('');
      rule.isCodeCaretRule = true;
      rule.caretPath = 'extension.url';
      rule.value = new FshCanonical('OwlExtension');

      expect(rule.toFSH()).toBe('* ^extension.url = Canonical(OwlExtension)');
    });

    it('should produce FSH for a CaretValueRule with isCodeCaretRule where the code contains a space', () => {
      const rule = new CaretValueRule('');
      rule.pathArray = ['duck', 'big duck'];
      rule.isCodeCaretRule = true;
      rule.caretPath = 'display';
      rule.value = 'is it a big duck or a goose?';

      expect(rule.toFSH()).toBe('* #duck #"big duck" ^display = "is it a big duck or a goose?"');
    });
  });
});
