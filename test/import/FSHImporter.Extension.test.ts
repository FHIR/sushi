import {
  assertCardRule,
  assertFlagRule,
  assertOnlyRule,
  assertValueSetRule
} from '../utils/asserts';
import { importText } from '../../src/import';
import { logger } from '../../src/utils/FSHLogger';

describe('FSHImporter', () => {
  let mockWriter: jest.SpyInstance<boolean, [any, string, ((error: Error) => void)?]>;

  beforeAll(() => {
    mockWriter = jest.spyOn(logger.transports[0], 'write');
  });

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

        const result = importText(input);
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

        const result = importText(input);
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

        importText(input, 'Dupe.fsh');
        expect(mockWriter.mock.calls[mockWriter.mock.calls.length - 2][0].message).toMatch(
          /File: Dupe\.fsh.*Line 7\D.*Column 9\D.*Line 7\D.*Column 41\D/s
        );
        expect(mockWriter.mock.calls[mockWriter.mock.calls.length - 1][0].message).toMatch(
          /File: Dupe\.fsh.*Line 8\D.*Column 9\D.*Line 8\D.*Column 58\D/s
        );
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
        assertFlagRule(extension.rules[2], 'value[x]', true, undefined, undefined);
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
        assertFlagRule(extension.rules[0], 'extension', true, undefined, undefined);
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
        assertOnlyRule(extension.rules[0], 'value[x]', { type: 'Quantity' });
      });
    });
  });
});
