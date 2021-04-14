import {
  assertCardRule,
  assertAssignmentRule,
  assertFlagRule,
  assertOnlyRule,
  assertBindingRule,
  assertContainsRule,
  assertCaretValueRule,
  assertObeysRule,
  assertInsertRule
} from '../testhelpers/asserts';
import { FshCode } from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';

describe('FSHImporter', () => {
  describe('Profile', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible profile', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        `;

        const result = importSingleText(input, 'Simple.fsh');
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('Observation');
        // if no id is explicitly set, should default to name
        expect(profile.id).toBe('ObservationProfile');
        expect(profile.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 3,
          endColumn: 27
        });
        expect(profile.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse profile with name matching various possible tokens recognized as name', () => {
        // This basically exercises all the tokens we accept for name:
        // SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM | KW_UNITS;

        // Since we'll do the same thing over and over (and over), create a function for it
        const testToken = (token: string) => {
          const input = `
          Profile: ${token}
          Parent: Observation
          * value[x] only boolean
          `;
          const result = importSingleText(input);
          expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
          expect(result).toBeDefined();
          expect(result.profiles.size).toBe(1);
          const profile = result.profiles.get(token);
          expect(profile).toBeDefined();
          expect(profile.name).toBe(token);
        };

        testToken('MyProfile'); // SEQUENCE
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

      it('should parse profile with additional metadata properties', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        Mixins: Mixin1 and Mixin2 and Mixin3 and Mixin4
        `;

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('Observation');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
        expect(profile.mixins).toEqual(['Mixin1', 'Mixin2', 'Mixin3', 'Mixin4']);
        expect(profile.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 7,
          endColumn: 55
        });
      });

      it('should parse profile with numeric name, parent, id, and mixins', () => {
        const input = `
        Profile: 123
        Parent: 456
        Id: 789
        Mixins: 24 and 68
        `;

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('123');
        expect(profile.name).toBe('123');
        expect(profile.parent).toBe('456');
        expect(profile.id).toBe('789');
        expect(profile.mixins).toEqual(['24', '68']);
      });

      it('should properly parse a multi-string description', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
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
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
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
        expect(profile.description).toBe(expectedDescriptionLines.join('\n'));
      });

      it('should accept and translate an alias for the parent', () => {
        const input = `
        Alias: OBS = http://hl7.org/fhir/StructureDefinition/Observation

        Profile: ObservationProfile
        Parent: OBS
        `;

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        Mixins: Mixin1
        Parent: DuplicateObservation
        Id: duplicate-observation-profile
        Title: "Duplicate Observation Profile"
        Description: "A duplicated profile on Observation"
        Mixins: DuplicateMixin1
        `;

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
        expect(profile.mixins).toEqual(['Mixin1']);
      });

      it('should deduplicate repeated mixins and log a warning', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Mixins: Mixin1 and Mixin2 and Mixin1
        `;

        const result = importSingleText(input, 'Dupe.fsh');
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.mixins).toEqual(['Mixin1', 'Mixin2']);
        expect(loggerSpy.getLastMessage('warn')).toMatch(/Mixin1.*File: Dupe.fsh.*Line: 4\D*/s);
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        Title: "Duplicate Observation Profile"
        Description: "A duplicated profile on Observation"
        `;

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the profile when encountering a profile with a name used by another profile', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Title: "First Observation Profile"

        Profile: ObservationProfile
        Parent: Observation
        Title: "Second Observation Profile"
        `;
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.title).toBe('First Observation Profile');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Profile named ObservationProfile already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 6 - 8\D*/s);
      });
    });

    // Tests for all supported rules are in FSHImporter.SD-Rules.test.ts
    // Since Profiles use the same rule parsing code as other StructureDefinitions, only do minimal tests of rules
    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5
        * value[x] 1..1
        * component 2..*
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertCardRule(profile.rules[1], 'value[x]', 1, 1);
        assertCardRule(profile.rules[2], 'component', 2, '*');
      });

      it('should parse card rules w/ multiple flags', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS ?! TU
        * value[x] 1..1 ?! SU N
        * component 2..* SU MS D
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(6);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertFlagRule(
          profile.rules[1],
          'category',
          true,
          undefined,
          true,
          true,
          undefined,
          undefined
        );
        assertCardRule(profile.rules[2], 'value[x]', 1, 1);
        assertFlagRule(
          profile.rules[3],
          'value[x]',
          undefined,
          true,
          true,
          undefined,
          true,
          undefined
        );
        assertCardRule(profile.rules[4], 'component', 2, '*');
        assertFlagRule(
          profile.rules[5],
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
        Profile: ObservationProfile
        Parent: Observation
        * category MS
        * value[x] ?!
        * component SU
        * interpretation TU
        * note N
        * bodySite D
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(6);
        assertFlagRule(
          profile.rules[0],
          'category',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[1],
          'value[x]',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[2],
          'component',
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[3],
          'interpretation',
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[4],
          'note',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[5],
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
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet (required)
        * code from CodeValueSet (extensible)
        * valueCodeableConcept from ValueValueSet (preferred)
        * component.code from ComponentCodeValueSet (example)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertBindingRule(profile.rules[0], 'category', 'CategoryValueSet', 'required');
        assertBindingRule(profile.rules[1], 'code', 'CodeValueSet', 'extensible');
        assertBindingRule(profile.rules[2], 'valueCodeableConcept', 'ValueValueSet', 'preferred');
        assertBindingRule(profile.rules[3], 'component.code', 'ComponentCodeValueSet', 'example');
      });
    });

    describe('#assignmentRule', () => {
      it('should parse assigned value boolean rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueBoolean = true
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueBoolean', true);
      });

      it('should parse assigned value boolean rule with (exactly) modifier', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueBoolean = true (exactly)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueBoolean', true, true);
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only Quantity
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'value[x]', { type: 'Quantity' });
      });
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one item', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
      });

      it('should parse contains rule with one item declaring an aliased type', () => {
        const input = `
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains OffsetExtension named offset 0..1
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component.extension', {
          name: 'offset',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-timeOffset'
        });
        assertCardRule(profile.rules[1], 'component.extension[offset]', 0, 1);
      });
    });

    describe('#caretValueRule', () => {
      it('should parse caret value rules with a path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * status ^short = "foo"
        * status ^sliceIsConstraining = false
        * status ^code[0] = foo#bar "baz"
        `;
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], 'status', 'short', 'foo', false);
        assertCaretValueRule(profile.rules[1], 'status', 'sliceIsConstraining', false, false);
        assertCaretValueRule(
          profile.rules[2],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 29, 6, 41]).withFile(''),
          false
        );
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with multiple invariants and a path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category obeys SomeInvariant and ThisInvariant and ThatInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertObeysRule(profile.rules[0], 'category', 'SomeInvariant');
        assertObeysRule(profile.rules[1], 'category', 'ThisInvariant');
        assertObeysRule(profile.rules[2], 'category', 'ThatInvariant');
      });
    });

    describe('#insertRule', () => {
      it('should parse an insert rule with a single RuleSet', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MyRuleSet
        `;
        const result = importSingleText(input, 'Insert.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'MyRuleSet');
      });
    });
  });
});
