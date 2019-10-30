import {
  assertCardRule,
  assertFlagRule,
  assertOnlyRule,
  assertValueSetRule
} from '../utils/asserts';
import { importText } from '../../src/import';

describe('FSHImporter', () => {
  describe('Extension', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible extension', () => {
        const input = `
        Extension: SomeExtension
        `;

        const result = importText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        // if no parent is explicitly set, should default to Extension
        expect(extension.parent).toBe('Extension');
        // if no id is explicitly set, should default to name
        expect(extension.id).toBe('SomeExtension');
      });

      it('should parse profile with additional metadata properties', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        Id: some-extension
        Title: "Some Extension"
        Description: "An extension on something"
        `;

        const result = importText(input);
        expect(result.extensions.size).toBe(1);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.name).toBe('SomeExtension');
        expect(extension.parent).toBe('ParentExtension');
        expect(extension.id).toBe('some-extension');
        expect(extension.title).toBe('Some Extension');
        expect(extension.description).toBe('An extension on something');
      });
    });

    // Since Extensions use the same rule parsing code as Profiles, only do a minimal tests
    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Extension: SomeExtension
        * extension 0..0
        * value[x] 1..1
        `;

        const result = importText(input);
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

        const result = importText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(3);
        assertCardRule(extension.rules[0], 'extension', 0, 0);
        assertCardRule(extension.rules[1], 'value[x]', 1, 1);
        assertFlagRule(extension.rules[2], 'value[x]', true, false, false);
      });
    });

    // Since Extensions use the same rule parsing code as Profiles, only do a minimal tests
    describe('#flagRule', () => {
      it('should parse single-path single-value flag rules', () => {
        const input = `
        Extension: SomeExtension
        * extension MS
        `;

        const result = importText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertFlagRule(extension.rules[0], 'extension', true, false, false);
      });
    });

    // Since Extensions use the same rule parsing code as Profiles, only do a minimal tests
    describe('#valueSetRule', () => {
      it('should parse value set rules w/ names and strength', () => {
        const input = `
        Extension: SomeExtension
        Parent: ParentExtension
        * valueCodeableConcept from ExtensionValueSet (extensible)
        `;

        const result = importText(input);
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

    // Since Extensions use the same rule parsing code as Profiles, only do a minimal tests
    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Extension: SomeExtension
        * value[x] only Quantity
        `;

        const result = importText(input);
        const extension = result.extensions.get('SomeExtension');
        expect(extension.rules).toHaveLength(1);
        assertOnlyRule(extension.rules[0], 'value[x]', 'Quantity');
      });
    });
  });
});
