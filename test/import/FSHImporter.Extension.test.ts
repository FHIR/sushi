import {
  assertCardRule,
  assertFlagRule,
  assertOnlyRule,
  assertBindingRule,
  assertCaretValueRule,
  assertObeysRule,
  assertContainsRule,
  assertAssignmentRule,
  assertInsertRule
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
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(extension.parent).toBe('ParentExtension');
        expect(extension.id).toBe('some-extension');
        expect(extension.title).toBe('Some Extension');
        expect(extension.description).toBe('An extension on something');
        expect(extension.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 6,
          endColumn: 48
        });
      });

      it('should parse numeric extension name, parent, and id', () => {
        // NOT recommended, but possible
        const input = `
        Extension: 123
        Parent: 456
        Id: 789
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('123');
        expect(extension.name).toBe('123');
        expect(extension.parent).toBe('456');
        expect(extension.id).toBe('789');
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        Id: some-extension
        Title: "Some Extension"
        Description: "An extension on something"
        Parent: DuplicateParentExtension
        Id: some-duplicate-extension
        Title: "Some Duplicate Extension"
        Description: "A duplicated extension on something"
        `;

        const result = importSingleText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(extension.parent).toBe('ParentExtension');
        expect(extension.id).toBe('some-extension');
        expect(extension.title).toBe('Some Extension');
        expect(extension.description).toBe('An extension on something');
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

      it('should log an error and skip the extension when encountering an extension with a name used by another extension', () => {
        const input = `
        Extension: SomeExtension
        Title: "This Extension"

        Extension: SomeExtension
        Title: "That Extension"
        `;

        const result = importSingleText(input, 'SameName.fsh');
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.title).toBe('This Extension');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Extension named SomeExtension already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 5 - 6\D*/s);
      });

      it('should log an error when the deprecated Mixins keyword is used', () => {
        const input = `
        Extension: SomeExtension
        Mixins: RuleSet1 and RuleSet2
        `;

        const result = importSingleText(input, 'Deprecated.fsh');
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'Mixins' keyword is no longer supported\./s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Deprecated\.fsh.*Line: 3\D*/s);
      });
    });

    // Tests for all supported rules are in FSHImporter.SD-Rules.test.ts
    // Since Extensions use the same rule parsing code as other StructureDefinitions, only do minimal tests of rules
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
        * value[x] 1..1 MS N
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertCardRule(extension.rules[0], 'extension', 0, 0);
        assertCardRule(extension.rules[1], 'value[x]', 1, 1);
        assertFlagRule(
          extension.rules[2],
          'value[x]',
          true,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
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
        assertFlagRule(
          extension.rules[0],
          'extension',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
      });
    });

    describe('#BindingRule', () => {
      it('should parse value set rules w/ names and strength', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        * valueCodeableConcept from ExtensionValueSet (extensible)
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertBindingRule(
          extension.rules[0],
          'valueCodeableConcept',
          'ExtensionValueSet',
          'extensible'
        );
      });
    });

    describe('#assignmentRule', () => {
      it('should parse assigned value boolean rule', () => {
        const input = `
        Extension: SomeExtension
        * valueBoolean = true
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertAssignmentRule(extension.rules[0], 'valueBoolean', true);
      });

      it('should parse assigned value boolean rule with (exactly) modifier', () => {
        const input = `
        Extension: SomeExtension
        * valueBoolean = true (exactly)
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertAssignmentRule(extension.rules[0], 'valueBoolean', true, true);
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
      it('should parse contains rule with one item', () => {
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

      it('should parse contains rule with item declaring a type', () => {
        const input = `
        Alias: MaxSizeExtension = http://hl7.org/fhir/StructureDefinition/maxSize
        Extension: SomeExtension
        * extension contains MaxSizeExtension named max 1..1
        * extension[max].value[x] MS N
        `;

        const result = importSingleText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertContainsRule(extension.rules[0], 'extension', {
          name: 'max',
          type: 'http://hl7.org/fhir/StructureDefinition/maxSize'
        });
        assertCardRule(extension.rules[1], 'extension[max]', 1, 1);
        assertFlagRule(
          extension.rules[2],
          'extension[max].value[x]',
          true,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
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
        assertCaretValueRule(extension.rules[0], 'id', 'short', 'foo', false);
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

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        Extension: MyExtension
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const extension = result.extensions.get('MyExtension');
        expect(extension.rules).toHaveLength(1);
        assertInsertRule(extension.rules[0], '', 'MyRuleSet');
      });
    });
  });
});
