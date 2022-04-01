import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';
import {
  assertAddElementRule,
  assertAssignmentRule,
  assertBindingRule,
  assertCardRule,
  assertCaretValueRule,
  assertContainsRule,
  assertFlagRule,
  assertInsertRule,
  assertObeysRule,
  assertOnlyRule
} from '../testhelpers';
import { FshCode } from '../../src/fshtypes';
import { leftAlign } from '../utils/leftAlign';
import { importText, RawFSH } from '../../src/import';

describe('FSHImporter', () => {
  describe('Resource', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible resource', () => {
        const input = `
        Resource: Simple
        `;

        const result = importSingleText(input, 'Simple.fsh');
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('Simple');
        expect(resource.name).toBe('Simple');
        expect(resource.parent).toBe('DomainResource');
        // if no id is explicitly set, should default to name
        expect(resource.id).toBe('Simple');
        expect(resource.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 2,
          endColumn: 24
        });
        expect(resource.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse resource with name matching various possible tokens recognized as name', () => {
        // This basically exercises all the tokens we accept for name:
        // SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM | KW_UNITS;

        // Since we'll do the same thing over and over (and over), create a function for it
        const testToken = (token: string) => {
          const input = leftAlign(`
          Resource: ${token}
          * value[x] only boolean
          `);
          const result = importSingleText(input);
          expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
          expect(result).toBeDefined();
          expect(result.resources.size).toBe(1);
          const resource = result.resources.get(token);
          expect(resource).toBeDefined();
          expect(resource.name).toBe(token);
        };

        testToken('MyResource'); // SEQUENCE
        testToken('123'); // NUMBER
        testToken('MS'); // KW_MS
        testToken('SU'); // KW_SU
        testToken('TU'); // KW_TU
        testToken('N'); // KW_NORMATIVE
        testToken('D'); // KW_DRAFT
        testToken('codes'); // KW_CODES
        testToken('valueset'); // KW_VSREFERENCE
        testToken('system'); // KW_SYSTEM
        testToken('units'); // KW_UNITS
      });

      it('should log an error when encountering the mixins metadata attribute', () => {
        const input = `
        Resource: TestWithMixins
        Mixins: Mixin1 and Mixin2 and Mixin3 and Mixin4
        `;
        importSingleText(input, 'TestWithMixins.fsh');
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: TestWithMixins\.fsh.*Line: 3\D*/s);
      });

      it('should parse resource with additional metadata properties', () => {
        const input = `
        Resource: TestWithMeta
        Id: test-with-meta
        Title: "A Test with Meta Resource"
        Description: "Test resource with meta"
        `;

        const result = importSingleText(input);
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('TestWithMeta');
        expect(resource.name).toBe('TestWithMeta');
        expect(resource.parent).toBe('DomainResource');
        expect(resource.id).toBe('test-with-meta');
        expect(resource.title).toBe('A Test with Meta Resource');
        expect(resource.description).toBe('Test resource with meta');
        expect(resource.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 5,
          endColumn: 46
        });
      });

      it('should parse resource with numeric name and id', () => {
        const input = `
        Resource: 123
        Id: 789
        `;

        const result = importSingleText(input);
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('123');
        expect(resource.name).toBe('123');
        expect(resource.id).toBe('789');
      });

      it('should properly parse a multi-string description', () => {
        const input = `
        Resource: TestWithMultiStringDesc
        Description:
          """
          This is a multi-string description
          with a couple of paragraphs.

          This is the second paragraph.  It has bullet points w/ indentation:

          * Bullet 1
            * Bullet A
            * Bullet B
              * Bullet i
            * Bullet C
          * Bullet 2
          """
        `;

        const result = importSingleText(input);
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('TestWithMultiStringDesc');
        const expectedDescriptionLines = [
          'This is a multi-string description',
          'with a couple of paragraphs.',
          '',
          'This is the second paragraph.  It has bullet points w/ indentation:',
          '',
          '* Bullet 1',
          '  * Bullet A',
          '  * Bullet B',
          '    * Bullet i',
          '  * Bullet C',
          '* Bullet 2'
        ];
        expect(resource.description).toBe(expectedDescriptionLines.join('\n'));
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Resource: TestResource
        Id: test-resource
        Title: "A Test Resource"
        Description: "A resource used for tests"
        Id: duplicate-test-resource
        Title: "Duplicate Test Resource"
        Description: "A duplicated resource"
        `;

        const result = importSingleText(input);
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('TestResource');
        expect(resource.name).toBe('TestResource');
        expect(resource.id).toBe('test-resource');
        expect(resource.title).toBe('A Test Resource');
        expect(resource.description).toBe('A resource used for tests');
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Resource: TestResource
        Id: test-resource
        Title: "A Test Resource"
        Description: "A resource used for tests"
        Id: duplicate-test-resource
        Title: "Duplicate Test Resource"
        Description: "A duplicated resource"
        `;

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Dupe\.fsh.*Line: 6\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the resource when encountering a resource with a name used by another resource', () => {
        const input = `
        Resource: TestResource
        Title: "First Test Resource"

        Resource: TestResource
        Title: "Second Test Resource"
        `;
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.resources.size).toBe(1);
        const resource = result.resources.get('TestResource');
        expect(resource.title).toBe('First Test Resource');

        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Resource named TestResource already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 5 - 6\D*/s);
      });

      it('should log an error and skip the resource when encountering an resource with a name used by another resource in another file', () => {
        const input1 = `
        Resource: SameResource
        Title: "First Resource"
      `;

        const input2 = `
        Resource: SameResource
        Title: "Second Resource"
      `;

        const result = importText([
          new RawFSH(input1, 'File1.fsh'),
          new RawFSH(input2, 'File2.fsh')
        ]);
        expect(result.reduce((sum, d2) => sum + d2.resources.size, 0)).toBe(1);
        const r = result[0].resources.get('SameResource');
        expect(r.title).toBe('First Resource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Resource named SameResource already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 3\D*/s);
      });
    });

    // Tests for all supported rules are in FSHImporter.SD-Rules.test.ts
    // Since Resources use the same rule parsing code as other StructureDefinitions, only do minimal tests of rules
    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Resource: TestResource
        * category 1..5
        * value[x] 1..1
        * component 2..*
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(3);
        assertCardRule(resource.rules[0], 'category', 1, 5);
        assertCardRule(resource.rules[1], 'value[x]', 1, 1);
        assertCardRule(resource.rules[2], 'component', 2, '*');
      });

      it('should parse card rules w/ multiple flags', () => {
        const input = `
        Resource: TestResource
        * category 1..5 MS ?! TU
        * value[x] 1..1 ?! SU N
        * component 2..* SU MS D
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(6);
        assertCardRule(resource.rules[0], 'category', 1, 5);
        assertFlagRule(
          resource.rules[1],
          'category',
          true,
          undefined,
          true,
          true,
          undefined,
          undefined
        );
        assertCardRule(resource.rules[2], 'value[x]', 1, 1);
        assertFlagRule(
          resource.rules[3],
          'value[x]',
          undefined,
          true,
          true,
          undefined,
          true,
          undefined
        );
        assertCardRule(resource.rules[4], 'component', 2, '*');
        assertFlagRule(
          resource.rules[5],
          'component',
          true,
          true,
          undefined,
          undefined,
          undefined,
          true
        );
      });
    });

    describe('#flagRule', () => {
      it('should parse single-path single-value flag rules', () => {
        const input = `
        Resource: TestResource
        * category MS
        * value[x] ?!
        * component SU
        * interpretation TU
        * note N
        * bodySite D
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(6);
        assertFlagRule(
          resource.rules[0],
          'category',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          resource.rules[1],
          'value[x]',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          resource.rules[2],
          'component',
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          resource.rules[3],
          'interpretation',
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
        assertFlagRule(
          resource.rules[4],
          'note',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          resource.rules[5],
          'bodySite',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
      });
    });

    describe('#BindingRule', () => {
      it('should parse value set rules w/ names and strengths', () => {
        const input = `
        Resource: TestResource
        * category from CategoryValueSet (required)
        * code from CodeValueSet (extensible)
        * valueCodeableConcept from ValueValueSet (preferred)
        * component.code from ComponentCodeValueSet (example)
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertBindingRule(resource.rules[0], 'category', 'CategoryValueSet', 'required');
        assertBindingRule(resource.rules[1], 'code', 'CodeValueSet', 'extensible');
        assertBindingRule(resource.rules[2], 'valueCodeableConcept', 'ValueValueSet', 'preferred');
        assertBindingRule(resource.rules[3], 'component.code', 'ComponentCodeValueSet', 'example');
      });
    });

    describe('#assignmentRule', () => {
      it('should parse assigned value boolean rule', () => {
        const input = `
        Resource: TestResource
        * valueBoolean = true
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(1);
        assertAssignmentRule(resource.rules[0], 'valueBoolean', true);
      });

      it('should parse assigned value boolean rule with (exactly) modifier', () => {
        const input = `
        Resource: TestResource
        * valueBoolean = true (exactly)
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(1);
        assertAssignmentRule(resource.rules[0], 'valueBoolean', true, true);
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Resource: TestResource
        * value[x] only Quantity
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(1);
        assertOnlyRule(resource.rules[0], 'value[x]', { type: 'Quantity' });
      });
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one item', () => {
        const input = `
        Resource: TestResource
        * component contains SystolicBP 1..1
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(2);
        assertContainsRule(resource.rules[0], 'component', 'SystolicBP');
        assertCardRule(resource.rules[1], 'component[SystolicBP]', 1, 1);
      });

      it('should parse contains rule with one item declaring an aliased type', () => {
        const input = `
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Resource: TestResource
        * component.extension contains OffsetExtension named offset 0..1
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(2);
        assertContainsRule(resource.rules[0], 'component.extension', {
          name: 'offset',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-timeOffset'
        });
        assertCardRule(resource.rules[1], 'component.extension[offset]', 0, 1);
      });
    });

    describe('#caretValueRule', () => {
      it('should parse caret value rules with a path', () => {
        const input = `
        Resource: TestResource
        * status ^short = "foo"
        * status ^sliceIsConstraining = false
        * status ^code[0] = foo#bar "baz"
        `;
        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        assertCaretValueRule(resource.rules[0], 'status', 'short', 'foo', false);
        assertCaretValueRule(resource.rules[1], 'status', 'sliceIsConstraining', false, false);
        assertCaretValueRule(
          resource.rules[2],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([5, 29, 5, 41]).withFile(''),
          false
        );
      });

      it('should parse caret value rules with triple-quoted string', () => {
        const input = `
        Resource: TestResource
        * status ^short = "foo"
        * status ^definition = """
          This definition includes markdown for unordered lists:
          * Level 1 list item 1
            * Level 2 list item 1a
            * Level 2 list item 1b
          * Level 1 list item 2
        """
        * status ^sliceIsConstraining = false
        * status ^code[0] = foo#bar "baz"
        `;
        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        assertCaretValueRule(resource.rules[0], 'status', 'short', 'foo', false);
        const expectedDefinition =
          'This definition includes markdown for unordered lists:\n* Level 1 list item 1\n  * Level 2 list item 1a\n  * Level 2 list item 1b\n* Level 1 list item 2';
        assertCaretValueRule(resource.rules[1], 'status', 'definition', expectedDefinition, false);
        assertCaretValueRule(resource.rules[2], 'status', 'sliceIsConstraining', false, false);
        assertCaretValueRule(
          resource.rules[3],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([12, 29, 12, 41]).withFile(''),
          false
        );
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with multiple invariants and a path', () => {
        const input = `
        Resource: TestResource
        * category obeys SomeInvariant and ThisInvariant and ThatInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(3);
        assertObeysRule(resource.rules[0], 'category', 'SomeInvariant');
        assertObeysRule(resource.rules[1], 'category', 'ThisInvariant');
        assertObeysRule(resource.rules[2], 'category', 'ThatInvariant');
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        Resource: TestResource
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(1);
        assertInsertRule(resource.rules[0], '', 'MyRuleSet');
      });
    });

    describe('#addElementRule', () => {
      it('should parse complete add element rules', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* Address "Just an address"
        * extraThing 0..3 contentReference http://example.org/StructureDefinition/Thing#Thing.extra "extra thing"
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'is it valid?', definition: 'is it valid?' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'just stuff', definition: 'a list of some stuff' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }],
          defs: { short: 'Just an address', definition: 'Just an address' }
        });
        assertAddElementRule(resource.rules[3], 'extraThing', {
          card: { min: 0, max: '3' },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Thing#Thing.extra',
            short: 'extra thing',
            definition: 'extra thing'
          }
        });
      });

      it('should parse complete add element rules with triple-quoted string for definition', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* Address "Just an address" 
          """
            This definition for address includes markdown for unordered lists:
            * Level 1 list item 1
              * Level 2 list item 1a
              * Level 2 list item 1b
            * Level 1 list item 2
          """
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(3);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'is it valid?', definition: 'is it valid?' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'just stuff', definition: 'a list of some stuff' }
        });
        const expectedDefinition =
          'This definition for address includes markdown for unordered lists:\n* Level 1 list item 1\n  * Level 2 list item 1a\n  * Level 2 list item 1b\n* Level 1 list item 2';
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }],
          defs: { short: 'Just an address', definition: expectedDefinition }
        });
      });
    });
  });
});
