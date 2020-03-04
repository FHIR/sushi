import {
  assertCardRule,
  assertFlagRule,
  assertOnlyRule,
  assertValueSetRule,
  assertCaretValueRule,
  assertObeysRule,
  assertContainsRule
} from '../testhelpers/asserts';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';

describe('FSHImporter', () => {
  describe('Extension', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible extension', () => {
        const input = `
        Extension: SomeExtension
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        // if no parent is explicitly set, should default to Extension
        expect(extension.parent).toBe('Extension');
        // if no id is explicitly set, should default to name
        expect(extension.id).toBe('SomeExtension');
        expect(extension.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 2,
          endColumn: 32
        });
      });

      it('should parse profile with additional metadata properties', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        Id: some-extension
        Title: "Some Extension"
        Description: "An extension on something"
        Mixins: Mixin1 , Mixin2,Mixin3, Mixin4
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(extension.parent).toBe('ParentExtension');
        expect(extension.id).toBe('some-extension');
        expect(extension.title).toBe('Some Extension');
        expect(extension.description).toBe('An extension on something');
        expect(extension.mixins).toEqual(['Mixin1', 'Mixin2,Mixin3', 'Mixin4']);
        expect(extension.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 7,
          endColumn: 46
        });
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        Id: some-extension
        Title: "Some Extension"
        Description: "An extension on something"
        Mixins: Mixin1
        Parent: DuplicateParentExtension
        Id: some-duplicate-extension
        Title: "Some Duplicate Extension"
        Description: "A duplicated extension on something"
        Mixins: DuplicateMixin1
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(extension.parent).toBe('ParentExtension');
        expect(extension.id).toBe('some-extension');
        expect(extension.title).toBe('Some Extension');
        expect(extension.description).toBe('An extension on something');
        expect(extension.mixins).toEqual(['Mixin1']);
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        Id: some-extension
        Title: "Some Extension"
        Description: "An extension on something"
        Title: "Some Duplicate Extension"
        Description: "A duplicated extension on something"
        `;

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
      });
    });

    // Since Extensions use the same rule parsing code as Profiles, only do minimal tests of rules
    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Extension: SomeExtension
        * extension 0..0
        * value[x] 1..1
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(2);
        assertCardRule(extension.rules[0], 'extension', 0, 0);
        assertCardRule(extension.rules[1], 'value[x]', 1, 1);
      });

      it('should parse card rules w/ flags', () => {
        const input = `
        Extension: SomeExtension
        * extension 0..0
        * value[x] 1..1 MS
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertCardRule(extension.rules[0], 'extension', 0, 0);
        assertCardRule(extension.rules[1], 'value[x]', 1, 1);
        assertFlagRule(extension.rules[2], 'value[x]', true, undefined, undefined);
      });
    });

    describe('#flagRule', () => {
      it('should parse single-path single-value flag rules', () => {
        const input = `
        Extension: SomeExtension
        * extension MS
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertFlagRule(extension.rules[0], 'extension', true, undefined, undefined);
      });
    });

    describe('#valueSetRule', () => {
      it('should parse value set rules w/ names and strength', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        * valueCodeableConcept from ExtensionValueSet (extensible)
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertValueSetRule(
          extension.rules[0],
          'valueCodeableConcept',
          'ExtensionValueSet',
          'extensible'
        );
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Extension: SomeExtension
        * value[x] only Quantity
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertOnlyRule(extension.rules[0], 'value[x]', { type: 'Quantity' });
      });
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one type', () => {
        const input = `
        Extension: SomeExtension
        * extension contains foo 1..1
        * extension[foo].value[x] only Quantity
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertContainsRule(extension.rules[0], 'extension', 'foo');
        assertCardRule(extension.rules[1], 'extension[foo]', 1, 1);
        assertOnlyRule(extension.rules[2], 'extension[foo].value[x]', { type: 'Quantity' });
      });

      it('should parse contains rule with reserved word (code)', () => {
        const input = `
        Extension: SomeExtension
        * extension contains code 1..1
        * extension[code].value[x] only Quantity
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertContainsRule(extension.rules[0], 'extension', 'code');
        assertCardRule(extension.rules[1], 'extension[code]', 1, 1);
        assertOnlyRule(extension.rules[2], 'extension[code].value[x]', { type: 'Quantity' });
      });
    });

    describe('#caretValueRule', () => {
      it('should parse a caret value rule with a path', () => {
        const input = `
        Extension: SomeExtension
        * id ^short = "foo"
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertCaretValueRule(extension.rules[0], 'id', 'short', 'foo');
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with a path and multiple invariants', () => {
        const input = `
        Extension: SomeExtension
        * extension obeys inv-1 and inv-2
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(2);
        assertObeysRule(extension.rules[0], 'extension', 'inv-1');
        assertObeysRule(extension.rules[1], 'extension', 'inv-2');
      });
    });
  });
});
