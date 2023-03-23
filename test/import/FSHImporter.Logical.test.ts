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
  beforeEach(() => loggerSpy.reset());

  describe('Logical', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible logical model', () => {
        const input = `
        Logical: MyLogicalModel
        `;

        const result = importSingleText(input, 'Simple.fsh');
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyLogicalModel');
        expect(logical.name).toBe('MyLogicalModel');
        expect(logical.parent).toBe('Base');
        // if no id is explicitly set, should default to name
        expect(logical.id).toBe('MyLogicalModel');
        expect(logical.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 2,
          endColumn: 31
        });
        expect(logical.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse logical model with name matching various possible tokens recognized as name', () => {
        // This basically exercises all the tokens we accept for name:
        // SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM | KW_UNITS;

        // Since we'll do the same thing over and over (and over), create a function for it
        const testToken = (token: string) => {
          const input = leftAlign(`
          Logical: ${token}
          Parent: BaseObservationModel
          * value[x] only boolean
          `);
          const result = importSingleText(input);
          expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
          expect(result).toBeDefined();
          expect(result.logicals.size).toBe(1);
          const logical = result.logicals.get(token);
          expect(logical).toBeDefined();
          expect(logical.name).toBe(token);
        };

        testToken('MyLogical'); // SEQUENCE
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
        Logical: TestWithMixins
        Mixins: Mixin1 and Mixin2 and Mixin3 and Mixin4
        `;
        importSingleText(input, 'TestWithMixins.fsh');
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: TestWithMixins\.fsh.*Line: 3\D*/s);
      });

      it('should parse logical model with additional metadata properties', () => {
        const input = `
        Logical: MyObservationModel
        Parent: BaseObservationModel
        Id: observation-model
        Title: "An Observation-based Logical Model"
        Description: "A logical model based on Observation"
        `;

        const result = importSingleText(input);
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyObservationModel');
        expect(logical.name).toBe('MyObservationModel');
        expect(logical.parent).toBe('BaseObservationModel');
        expect(logical.id).toBe('observation-model');
        expect(logical.title).toBe('An Observation-based Logical Model');
        expect(logical.description).toBe('A logical model based on Observation');
        expect(logical.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 6,
          endColumn: 59
        });
      });

      it('should parse logical model with numeric name, parent, and id', () => {
        const input = `
        Logical: 123
        Parent: 456
        Id: 789
        `;

        const result = importSingleText(input);
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('123');
        expect(logical.name).toBe('123');
        expect(logical.parent).toBe('456');
        expect(logical.id).toBe('789');
      });

      it('should properly parse a multi-string description', () => {
        const input = `
        Logical: MyObservationModel
        Parent: BaseObservationModel
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
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyObservationModel');
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
        expect(logical.description).toBe(expectedDescriptionLines.join('\n'));
      });

      it('should accept and translate an alias for the parent', () => {
        const input = `
        Alias: OBS = http://example.com/fhir/StructureDefinition/BaseObservationModel

        Logical: MyObservationModel
        Parent: OBS
        `;

        const result = importSingleText(input);
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyObservationModel');
        expect(logical.name).toBe('MyObservationModel');
        expect(logical.parent).toBe(
          'http://example.com/fhir/StructureDefinition/BaseObservationModel'
        );
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Logical: MyObservationModel
        Parent: BaseObservationModel
        Id: observation-model
        Title: "An Observation-based Logical Model"
        Description: "A logical model based on Observation"
        Parent: DuplicateBaseObservationModel
        Id: duplicate-observation-model
        Title: "Duplicate Observation-based Logical Model"
        Description: "Duplicate logical model based on Observation"
        `;

        const result = importSingleText(input);
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyObservationModel');
        expect(logical.name).toBe('MyObservationModel');
        expect(logical.parent).toBe('BaseObservationModel');
        expect(logical.id).toBe('observation-model');
        expect(logical.title).toBe('An Observation-based Logical Model');
        expect(logical.description).toBe('A logical model based on Observation');
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Logical: MyObservationModel
        Parent: BaseObservationModel
        Id: observation-model
        Title: "An Observation-based Logical Model"
        Description: "A logical model based on Observation"
        Parent: DuplicateBaseObservationModel
        Id: duplicate-observation-model
        Title: "Duplicate Observation-based Logical Model"
        Description: "Duplicate logical model based on Observation"
        `;

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-4, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getMessageAtIndex(-3, 'error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 9\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 10\D*/s);
      });

      it('should log an error and skip the logical model when encountering a logical model with a name used by another logical model', () => {
        const input = `
        Logical: MyObservationModel
        Parent: BaseObservationModel
        Title: "An Observation-based Logical Model"

        Logical: MyObservationModel
        Parent: BaseObservationModel
        Title: "Second Observation-based Logical Model"
        `;
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.logicals.size).toBe(1);
        const logical = result.logicals.get('MyObservationModel');
        expect(logical.title).toBe('An Observation-based Logical Model');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Logical Model named MyObservationModel already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 6 - 8\D*/s);
      });

      it('should log an error and skip the logical when encountering an logical with a name used by another logical in another file', () => {
        const input1 = `
          Logical: MyObservationModel
          Parent: BaseObservationModel
          Title: "An Observation-based Logical Model"
        `;

        const input2 = `
          Logical: MyObservationModel
          Parent: BaseObservationModel
          Title: "Second Observation-based Logical Model"
        `;

        const result = importText([
          new RawFSH(input1, 'File1.fsh'),
          new RawFSH(input2, 'File2.fsh')
        ]);
        expect(result.reduce((sum, d2) => sum + d2.logicals.size, 0)).toBe(1);
        const l = result[0].logicals.get('MyObservationModel');
        expect(l.title).toBe('An Observation-based Logical Model');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Logical Model named MyObservationModel already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 4\D*/s);
      });
    });

    // Tests for all supported rules are in FSHImporter.SDRules.test.ts
    // Since Logicals use the same rule parsing code as other StructureDefinitions, only do minimal tests of rules
    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Logical: LogicalModel
        * category 1..5
        * value[x] 1..1
        * component 2..*
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertCardRule(logical.rules[0], 'category', 1, 5);
        assertCardRule(logical.rules[1], 'value[x]', 1, 1);
        assertCardRule(logical.rules[2], 'component', 2, '*');
      });

      it('should parse card rules w/ multiple flags', () => {
        const input = `
        Logical: LogicalModel
        * category 1..5 MS ?! TU
        * value[x] 1..1 ?! SU N
        * component 2..* SU MS D
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(6);
        assertCardRule(logical.rules[0], 'category', 1, 5);
        assertFlagRule(
          logical.rules[1],
          'category',
          true,
          undefined,
          true,
          true,
          undefined,
          undefined
        );
        assertCardRule(logical.rules[2], 'value[x]', 1, 1);
        assertFlagRule(
          logical.rules[3],
          'value[x]',
          undefined,
          true,
          true,
          undefined,
          true,
          undefined
        );
        assertCardRule(logical.rules[4], 'component', 2, '*');
        assertFlagRule(
          logical.rules[5],
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
        Logical: LogicalModel
        * category MS
        * value[x] ?!
        * component SU
        * interpretation TU
        * note N
        * bodySite D
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(6);
        assertFlagRule(
          logical.rules[0],
          'category',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          logical.rules[1],
          'value[x]',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          logical.rules[2],
          'component',
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          logical.rules[3],
          'interpretation',
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
        assertFlagRule(
          logical.rules[4],
          'note',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          logical.rules[5],
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
        Logical: LogicalModel
        * category from CategoryValueSet (required)
        * code from CodeValueSet (extensible)
        * valueCodeableConcept from ValueValueSet (preferred)
        * component.code from ComponentCodeValueSet (example)
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(4);
        assertBindingRule(logical.rules[0], 'category', 'CategoryValueSet', 'required');
        assertBindingRule(logical.rules[1], 'code', 'CodeValueSet', 'extensible');
        assertBindingRule(logical.rules[2], 'valueCodeableConcept', 'ValueValueSet', 'preferred');
        assertBindingRule(logical.rules[3], 'component.code', 'ComponentCodeValueSet', 'example');
      });
    });

    describe('#assignmentRule', () => {
      it('should parse assigned value boolean rule', () => {
        const input = `
        Logical: LogicalModel
        * valueBoolean = true
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(1);
        assertAssignmentRule(logical.rules[0], 'valueBoolean', true);
      });

      it('should parse assigned value boolean rule with (exactly) modifier', () => {
        const input = `
        Logical: LogicalModel
        * valueBoolean = true (exactly)
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(1);
        assertAssignmentRule(logical.rules[0], 'valueBoolean', true, true);
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Logical: LogicalModel
        * value[x] only Quantity
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(1);
        assertOnlyRule(logical.rules[0], 'value[x]', { type: 'Quantity' });
      });
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one item', () => {
        const input = `
        Logical: LogicalModel
        * component contains SystolicBP 1..1
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(2);
        assertContainsRule(logical.rules[0], 'component', 'SystolicBP');
        assertCardRule(logical.rules[1], 'component[SystolicBP]', 1, 1);
      });

      it('should parse contains rule with one item declaring an aliased type', () => {
        const input = `
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Logical: LogicalModel
        * component.extension contains OffsetExtension named offset 0..1
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(2);
        assertContainsRule(logical.rules[0], 'component.extension', {
          name: 'offset',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-timeOffset'
        });
        assertCardRule(logical.rules[1], 'component.extension[offset]', 0, 1);
      });
    });

    describe('#caretValueRule', () => {
      it('should parse caret value rules with a path', () => {
        const input = `
        Logical: LogicalModel
        * status ^short = "foo"
        * status ^sliceIsConstraining = false
        * status ^code[0] = foo#bar "baz"
        `;
        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        assertCaretValueRule(logical.rules[0], 'status', 'short', 'foo', false);
        assertCaretValueRule(logical.rules[1], 'status', 'sliceIsConstraining', false, false);
        assertCaretValueRule(
          logical.rules[2],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([5, 29, 5, 41]).withFile(''),
          false
        );
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with multiple invariants and a path', () => {
        const input = `
        Logical: LogicalModel
        * category obeys SomeInvariant and ThisInvariant and ThatInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertObeysRule(logical.rules[0], 'category', 'SomeInvariant');
        assertObeysRule(logical.rules[1], 'category', 'ThisInvariant');
        assertObeysRule(logical.rules[2], 'category', 'ThatInvariant');
      });

      it('should parse an obeys rule on an element named obeys', () => {
        const input = `
        Logical: LogicalModel
        * obeys obeys SomeInvariant and ThisInvariant and ThatInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertObeysRule(logical.rules[0], 'obeys', 'SomeInvariant');
        assertObeysRule(logical.rules[1], 'obeys', 'ThisInvariant');
        assertObeysRule(logical.rules[2], 'obeys', 'ThatInvariant');
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        Logical: LogicalModel
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(1);
        assertInsertRule(logical.rules[0], '', 'MyRuleSet');
      });
    });

    describe('#addElementRule', () => {
      it('should parse complete add element rules', () => {
        const input = `
        Logical: LogicalModel
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* Address
        `;

        const result = importSingleText(input);
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertAddElementRule(logical.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'is it valid?' }
        });
        assertAddElementRule(logical.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'just stuff', definition: 'a list of some stuff' }
        });
        assertAddElementRule(logical.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }]
        });
      });

      it('should parse add element rules where the element name is numeric', () => {
        const input = leftAlign(`
        Logical: LogicalModel
        * 7 0..1 string "This element's name is seven"
        * 35 0..* BackboneElement "This complex element is three five"
        * 35.79 1..1 boolean "This is seven nine, contained within three five"
        `);
        const result = importSingleText(input, 'NumericElementNames.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertAddElementRule(logical.rules[0], '7', {
          card: { min: 0, max: '1' },
          types: [{ type: 'string' }],
          defs: { short: "This element's name is seven" }
        });
        assertAddElementRule(logical.rules[1], '35', {
          card: { min: 0, max: '*' },
          types: [{ type: 'BackboneElement' }],
          defs: { short: 'This complex element is three five' }
        });
        assertAddElementRule(logical.rules[2], '35.79', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }],
          defs: { short: 'This is seven nine, contained within three five' }
        });
        expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
      });

      it('should parse add element rules where the element name is a FSH keyword', () => {
        const input = leftAlign(`
        Logical: KeywordLogical
        * MS 0..1 string "Element named MS"
        * SU 0..2 number "Element named SU"
        * TU 1..1 boolean "Element named TU"
        * N 0..* code "Element named N"
        * D 1..* MS Coding "Element named D"
        * from 0..1 Address "From an address"
        * contains 0..* string "Contains many strings"
        * named 1..1 HumanName "Has a name"
        * and 0..1 boolean "And what?"
        * only 0..1 number "Only number"
        * or 0..3 string "Or three strings"
        * obeys 1..1 boolean "Obey boolean"
        * true 0..1 boolean "Please don't make an element named true"
        * false 0..1 boolean "Please don't make an element named false, either"
        * include 0..1 Coding "Include a coding"
        * exclude 0..1 Coding "Exclude a coding"
        * codes 0..* code "List of codes"
        * where 1..1 Address "Where is it?"
        * valueset 0..1 uri "Give me a value set"
        * system 0..1 uri "Give me a system"
        * contentReference 1..1 contentReference http://example.org/StructureDefinition/Keywords#Keywords.content "A content reference with a content reference"
        `);
        const result = importSingleText(input, 'KeywordLogical.fsh');
        const logical = result.logicals.get('KeywordLogical');
        expect(logical.rules).toHaveLength(21);
        assertAddElementRule(logical.rules[0], 'MS', {
          card: { min: 0, max: '1' },
          types: [{ type: 'string' }],
          defs: {
            short: 'Element named MS'
          }
        });
        assertAddElementRule(logical.rules[1], 'SU', {
          card: { min: 0, max: '2' },
          types: [{ type: 'number' }],
          defs: {
            short: 'Element named SU'
          }
        });
        assertAddElementRule(logical.rules[2], 'TU', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }],
          defs: {
            short: 'Element named TU'
          }
        });
        assertAddElementRule(logical.rules[3], 'N', {
          card: { min: 0, max: '*' },
          types: [{ type: 'code' }],
          defs: {
            short: 'Element named N'
          }
        });
        assertAddElementRule(logical.rules[4], 'D', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Coding' }],
          flags: { mustSupport: true },
          defs: {
            short: 'Element named D'
          }
        });
        assertAddElementRule(logical.rules[5], 'from', {
          card: { min: 0, max: '1' },
          types: [{ type: 'Address' }],
          defs: {
            short: 'From an address'
          }
        });
        assertAddElementRule(logical.rules[6], 'contains', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: {
            short: 'Contains many strings'
          }
        });
        assertAddElementRule(logical.rules[7], 'named', {
          card: { min: 1, max: '1' },
          types: [{ type: 'HumanName' }],
          defs: {
            short: 'Has a name'
          }
        });
        assertAddElementRule(logical.rules[8], 'and', {
          card: { min: 0, max: '1' },
          types: [{ type: 'boolean' }],
          defs: {
            short: 'And what?'
          }
        });
        assertAddElementRule(logical.rules[9], 'only', {
          card: { min: 0, max: '1' },
          types: [{ type: 'number' }],
          defs: {
            short: 'Only number'
          }
        });
        assertAddElementRule(logical.rules[10], 'or', {
          card: { min: 0, max: '3' },
          types: [{ type: 'string' }],
          defs: {
            short: 'Or three strings'
          }
        });
        assertAddElementRule(logical.rules[11], 'obeys', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }],
          defs: {
            short: 'Obey boolean'
          }
        });
        assertAddElementRule(logical.rules[12], 'true', {
          card: { min: 0, max: '1' },
          types: [{ type: 'boolean' }],
          defs: {
            short: "Please don't make an element named true"
          }
        });
        assertAddElementRule(logical.rules[13], 'false', {
          card: { min: 0, max: '1' },
          types: [{ type: 'boolean' }],
          defs: {
            short: "Please don't make an element named false, either"
          }
        });
        assertAddElementRule(logical.rules[14], 'include', {
          card: { min: 0, max: '1' },
          types: [{ type: 'Coding' }],
          defs: {
            short: 'Include a coding'
          }
        });
        assertAddElementRule(logical.rules[15], 'exclude', {
          card: { min: 0, max: '1' },
          types: [{ type: 'Coding' }],
          defs: {
            short: 'Exclude a coding'
          }
        });
        assertAddElementRule(logical.rules[16], 'codes', {
          card: { min: 0, max: '*' },
          types: [{ type: 'code' }],
          defs: {
            short: 'List of codes'
          }
        });
        assertAddElementRule(logical.rules[17], 'where', {
          card: { min: 1, max: '1' },
          types: [{ type: 'Address' }],
          defs: {
            short: 'Where is it?'
          }
        });
        assertAddElementRule(logical.rules[18], 'valueset', {
          card: { min: 0, max: '1' },
          types: [{ type: 'uri' }],
          defs: {
            short: 'Give me a value set'
          }
        });
        assertAddElementRule(logical.rules[19], 'system', {
          card: { min: 0, max: '1' },
          types: [{ type: 'uri' }],
          defs: {
            short: 'Give me a system'
          }
        });
        assertAddElementRule(logical.rules[20], 'contentReference', {
          card: { min: 1, max: '1' },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Keywords#Keywords.content',
            short: 'A content reference with a content reference'
          }
        });
      });

      it('should parse content reference add element rules', () => {
        const input = `
        Logical: LogicalModel
        * oranges 1..* MS contentReference http://example.org/StructureDefinition/Citrus#Citrus.orange "oranges" "oranges are a citrus"
        * apples 0..3 contentReference http://example.org/StructureDefinition/Fruit#Fruit.apple "apples"
        `;

        const result = importSingleText(input, 'ContentReference.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(2);
        assertAddElementRule(logical.rules[0], 'oranges', {
          card: { min: 1, max: '*' },
          flags: { mustSupport: true },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Citrus#Citrus.orange',
            short: 'oranges',
            definition: 'oranges are a citrus'
          }
        });
        assertAddElementRule(logical.rules[1], 'apples', {
          card: { min: 0, max: '3' },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Fruit#Fruit.apple',
            short: 'apples',
            definition: 'apples'
          }
        });
      });

      it('should parse content reference add element rules that use an alias', () => {
        const input = `
        Alias: $orange = http://example.org/StructureDefinition/Citrus#Citrus.orange
        Logical: LogicalModel
        * oranges 1..* MS contentReference $orange "oranges" "oranges are a citrus"
        * apples 0..3 contentReference http://example.org/StructureDefinition/Fruit#Fruit.apple "apples"
        `;

        const result = importSingleText(input, 'ContentReference.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(2);
        assertAddElementRule(logical.rules[0], 'oranges', {
          card: { min: 1, max: '*' },
          flags: { mustSupport: true },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Citrus#Citrus.orange',
            short: 'oranges',
            definition: 'oranges are a citrus'
          }
        });
        assertAddElementRule(logical.rules[1], 'apples', {
          card: { min: 0, max: '3' },
          types: [],
          defs: {
            contentReference: 'http://example.org/StructureDefinition/Fruit#Fruit.apple',
            short: 'apples',
            definition: 'apples'
          }
        });
      });

      it('should log a warning when a data type is defined with a flag value', () => {
        const input = `
        Logical: LogicalModel
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* N "just stuff" "a list of some stuff"
        * address 1..* Address
        `;

        const result = importSingleText(input, 'WarnDataType.fsh');
        const logical = result.logicals.get('LogicalModel');
        expect(logical.rules).toHaveLength(3);
        assertAddElementRule(logical.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'is it valid?' }
        });
        assertAddElementRule(logical.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'N' }],
          defs: { short: 'just stuff', definition: 'a list of some stuff' }
        });
        assertAddElementRule(logical.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }]
        });

        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /The targetType 'N' appears to be a flag value rather than a valid target data type./s
        );
      });
    });
  });
});
