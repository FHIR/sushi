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
import {
  FshCanonical,
  FshCode,
  FshQuantity,
  FshRatio,
  FshReference,
  ParamRuleSet
} from '../../src/fshtypes';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { stats } from '../../src/utils/FSHLogger';
import { importSingleText } from '../testhelpers/importSingleText';
import { FSHImporter, importText, RawFSH } from '../../src/import';
import { EOL } from 'os';
import { leftAlign } from '../utils/leftAlign';

describe('FSHImporter', () => {
  describe('Profile', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible profile', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        `);

        const result = importSingleText(input, 'Simple.fsh');
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('Observation');
        // if no id is explicitly set, should default to name
        expect(profile.id).toBe('ObservationProfile');
        expect(profile.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 1,
          endLine: 3,
          endColumn: 19
        });
        expect(profile.sourceInfo.file).toBe('Simple.fsh');
      });

      it('should parse profile with name matching various possible tokens recognized as name', () => {
        // This basically exercises all the tokens we accept for name:
        // SEQUENCE | NUMBER | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT | KW_CODES | KW_VSREFERENCE | KW_SYSTEM;

        // Since we'll do the same thing over and over (and over), create a function for it
        const testToken = (token: string) => {
          const input = leftAlign(`
          Profile: ${token}
          Parent: Observation
          * value[x] only boolean
          `);
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
      });

      it('should parse profile with additional metadata properties', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        `);

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('Observation');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
        expect(profile.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 1,
          endLine: 6,
          endColumn: 39
        });
      });

      it('should parse profile with numeric name, parent, and id', () => {
        const input = leftAlign(`
        Profile: 123
        Parent: 456
        Id: 789
        `);

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('123');
        expect(profile.name).toBe('123');
        expect(profile.parent).toBe('456');
        expect(profile.id).toBe('789');
      });

      it('should properly parse a multi-string description', () => {
        const input = leftAlign(`
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
        `);

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
        const input = leftAlign(`
        Alias: OBS = http://hl7.org/fhir/StructureDefinition/Observation

        Profile: ObservationProfile
        Parent: OBS
        `);

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('http://hl7.org/fhir/StructureDefinition/Observation');
      });

      it('should only apply each metadata attribute the first time it is declared', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        Parent: DuplicateObservation
        Id: duplicate-observation-profile
        Title: "Duplicate Observation Profile"
        Description: "A duplicated profile on Observation"
        `);

        const result = importSingleText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
      });

      it('should log an error when encountering a duplicate metadata attribute', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        Title: "Duplicate Observation Profile"
        Description: "A duplicated profile on Observation"
        `);

        importSingleText(input, 'Dupe.fsh');
        expect(loggerSpy.getMessageAtIndex(-2, 'error')).toMatch(/File: Dupe\.fsh.*Line: 7\D*/s);
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Dupe\.fsh.*Line: 8\D*/s);
      });

      it('should log an error and skip the profile when encountering a profile with a name used by another profile', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        Title: "First Observation Profile"

        Profile: ObservationProfile
        Parent: Observation
        Title: "Second Observation Profile"
        `);
        const result = importSingleText(input, 'SameName.fsh');
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.title).toBe('First Observation Profile');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Profile named ObservationProfile already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: SameName\.fsh.*Line: 6 - 8\D*/s);
      });

      it('should log an error and skip the profile when encountering an profile with a name used by another profile in another file', () => {
        const input1 = `
        Profile: SameProfile
        Title: "First Profile"
        Parent: Observation
      `;

        const input2 = `
        Profile: SameProfile
        Title: "Second Profile"
        Parent: Observation
      `;

        const result = importText([
          new RawFSH(input1, 'File1.fsh'),
          new RawFSH(input2, 'File2.fsh')
        ]);
        expect(result.reduce((sum, d2) => sum + d2.profiles.size, 0)).toBe(1);
        const p = result[0].profiles.get('SameProfile');
        expect(p.title).toBe('First Profile');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Profile named SameProfile already exists/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: File2\.fsh.*Line: 2 - 4\D*/s);
      });

      it('should log an error when the deprecated Mixins keyword is used', () => {
        const input = leftAlign(`
        Profile: SomeProfile
        Parent: Observation
        Mixins: RuleSet1 and RuleSet2
        `);

        const result = importSingleText(input, 'Deprecated.fsh');
        expect(result.profiles.size).toBe(1);
        const extension = result.profiles.get('SomeProfile');
        expect(extension.name).toBe('SomeProfile');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'Mixins' keyword is no longer supported\./s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Deprecated\.fsh.*Line: 4\D*/s);
      });
    });

    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5
        * value[x] 1..1
        * component 2..*
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertCardRule(profile.rules[1], 'value[x]', 1, 1);
        assertCardRule(profile.rules[2], 'component', 2, '*');
      });

      it('should parse card rule with only min', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category 1..
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertCardRule(profile.rules[0], 'category', 1, ''); // Unspecified max
      });

      it('should parse card rule with only max', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category ..5
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertCardRule(profile.rules[0], 'category', NaN, '5'); // Unspecified min
      });

      it('should log an error if neither side is specified', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category ..
        `);

        const result = importSingleText(input, 'BadCard.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1); // Rule is still set and element's current cardinalities will be used at export
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Neither side of the cardinality was specified on path \"category\". A min, max, or both need to be specified.\D*/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadCard\.fsh.*Line: 4\D*/s);
      });

      it('should parse card rules w/ flags', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS
        * value[x] 1..1 ?!
        * component 2..* SU
        * interpretation 1..* TU
        * note 0..11 N
        * bodySite 1..1 D
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(12);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertFlagRule(
          profile.rules[1],
          'category',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertCardRule(profile.rules[2], 'value[x]', 1, 1);
        assertFlagRule(
          profile.rules[3],
          'value[x]',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertCardRule(profile.rules[4], 'component', 2, '*');
        assertFlagRule(
          profile.rules[5],
          'component',
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertCardRule(profile.rules[6], 'interpretation', 1, '*');
        assertFlagRule(
          profile.rules[7],
          'interpretation',
          undefined,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
        assertCardRule(profile.rules[8], 'note', 0, '11');
        assertFlagRule(
          profile.rules[9],
          'note',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        assertCardRule(profile.rules[10], 'bodySite', 1, '1');
        assertFlagRule(
          profile.rules[11],
          'bodySite',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
      });

      it('should parse card rules w/ multiple flags', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS ?! TU
        * value[x] 1..1 ?! SU N
        * component 2..* SU MS D
        `);

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
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category MS
        * value[x] ?!
        * component SU
        * interpretation TU
        * note N
        * bodySite D
        `);

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

      it('should parse single-path multi-value flag rules', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category MS ?! N
        * value[x] ?! SU D
        * component MS SU ?! TU
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertFlagRule(
          profile.rules[0],
          'category',
          true,
          undefined,
          true,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[1],
          'value[x]',
          undefined,
          true,
          true,
          undefined,
          undefined,
          true
        );
        assertFlagRule(profile.rules[2], 'component', true, true, true, true, undefined, undefined);
      });

      it('should parse multi-path single-value flag rules', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category and value[x] and component MS
        * subject and focus ?!
        * interpretation and note N
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(7);
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
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[2],
          'component',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[3],
          'subject',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[4],
          'focus',
          undefined,
          undefined,
          true,
          undefined,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[5],
          'interpretation',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[6],
          'note',
          undefined,
          undefined,
          undefined,
          undefined,
          true,
          undefined
        );
      });

      it('should parse multi-path multi-value flag rules', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category and value[x] and component MS SU N
        * subject and focus ?! SU TU
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertFlagRule(
          profile.rules[0],
          'category',
          true,
          true,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[1],
          'value[x]',
          true,
          true,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[2],
          'component',
          true,
          true,
          undefined,
          undefined,
          true,
          undefined
        );
        assertFlagRule(
          profile.rules[3],
          'subject',
          undefined,
          true,
          true,
          true,
          undefined,
          undefined
        );
        assertFlagRule(
          profile.rules[4],
          'focus',
          undefined,
          true,
          true,
          true,
          undefined,
          undefined
        );
      });

      it('should log an error when paths are listed with commas', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category, value[x] , component MS SU N
        `);

        const result = importSingleText(input, 'Deprecated.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Using ',' to list items is no longer supported/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Deprecated\.fsh.*Line: 4\D*/s);
      });
    });

    describe('#BindingRule', () => {
      it('should parse value set rules w/ names and strengths', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet (required)
        * code from CodeValueSet (extensible)
        * valueCodeableConcept from ValueValueSet (preferred)
        * component.code from ComponentCodeValueSet (example)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertBindingRule(profile.rules[0], 'category', 'CategoryValueSet', 'required');
        assertBindingRule(profile.rules[1], 'code', 'CodeValueSet', 'extensible');
        assertBindingRule(profile.rules[2], 'valueCodeableConcept', 'ValueValueSet', 'preferred');
        assertBindingRule(profile.rules[3], 'component.code', 'ComponentCodeValueSet', 'example');
      });

      it('should parse value set rules w/ urls and strengths', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category from http://example.org/fhir/ValueSet/CategoryValueSet (required)
        * code from http://example.org/fhir/ValueSet/CodeValueSet (extensible)
        * valueCodeableConcept from http://example.org/fhir/ValueSet/ValueValueSet (preferred)
        * component.code from http://example.org/fhir/ValueSet/ComponentCodeValueSet (example)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertBindingRule(
          profile.rules[0],
          'category',
          'http://example.org/fhir/ValueSet/CategoryValueSet',
          'required'
        );
        assertBindingRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'extensible'
        );
        assertBindingRule(
          profile.rules[2],
          'valueCodeableConcept',
          'http://example.org/fhir/ValueSet/ValueValueSet',
          'preferred'
        );
        assertBindingRule(
          profile.rules[3],
          'component.code',
          'http://example.org/fhir/ValueSet/ComponentCodeValueSet',
          'example'
        );
      });

      it('should accept and translate aliases for value set URLs', () => {
        const input = leftAlign(`
        Alias: CAT = http://example.org/fhir/ValueSet/CategoryValueSet
        Alias: CODE = http://example.org/fhir/ValueSet/CodeValueSet
        Alias: VALUE = http://example.org/fhir/ValueSet/ValueValueSet
        Alias: COMP = http://example.org/fhir/ValueSet/ComponentCodeValueSet

        Profile: ObservationProfile
        Parent: Observation
        * category from CAT (required)
        * code from CODE (extensible)
        * valueCodeableConcept from VALUE (preferred)
        * component.code from COMP (example)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertBindingRule(
          profile.rules[0],
          'category',
          'http://example.org/fhir/ValueSet/CategoryValueSet',
          'required'
        );
        assertBindingRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'extensible'
        );
        assertBindingRule(
          profile.rules[2],
          'valueCodeableConcept',
          'http://example.org/fhir/ValueSet/ValueValueSet',
          'preferred'
        );
        assertBindingRule(
          profile.rules[3],
          'component.code',
          'http://example.org/fhir/ValueSet/ComponentCodeValueSet',
          'example'
        );
      });

      it('should parse value set rules w/ numeric names', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category from 123 (required)
        * code from 456 (extensible)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertBindingRule(profile.rules[0], 'category', '123', 'required');
        assertBindingRule(profile.rules[1], 'code', '456', 'extensible');
      });

      it('should parse value set rules w/ no strength and default to required', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet
        * code from http://example.org/fhir/ValueSet/CodeValueSet
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertBindingRule(profile.rules[0], 'category', 'CategoryValueSet', 'required');
        assertBindingRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'required'
        );
      });

      it('should parse value set rules on Quantity', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity from http://unitsofmeasure.org
        `);

        const result = importSingleText(input, 'UselessQuant.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertBindingRule(
          profile.rules[0],
          'valueQuantity',
          'http://unitsofmeasure.org',
          'required'
        );
      });

      it('should log an error when parsing value set rules using the unit keyword', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity units from http://unitsofmeasure.org
        `);

        const result = importSingleText(input, 'Deprecated.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'units' keyword is no longer supported.*File: Deprecated\.fsh.*Line: 4\D*/s
        );
      });
    });

    describe('#assignmentRule', () => {
      it('should parse assigned value boolean rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueBoolean = true
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueBoolean', true);
      });

      it('should parse assigned value boolean rule with (exactly) modifier', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueBoolean = true (exactly)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueBoolean', true, true);
      });

      it('should parse assigned value number (decimal) rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueDecimal = 1.23
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueDecimal', 1.23);
      });

      it('should parse assigned value number (integer) rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueInteger = 123
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueInteger', BigInt(123));
      });

      it('should parse assigned value string rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueString = "hello world"
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueString', 'hello world');
      });

      it('should parse assigned value multi-line string rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueString = """
            hello
            world
            """
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueString', 'hello\nworld');
      });

      it('should parse assigned value date rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueDateTime = 2019-11-01T12:30:01.999Z
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertAssignmentRule(profile.rules[0], 'valueDateTime', '2019-11-01T12:30:01.999Z');
      });

      it('should parse assigned value time rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueTime = 12:30:01.999-05:00
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertAssignmentRule(profile.rules[0], 'valueTime', '12:30:01.999-05:00');
      });

      it('should parse assigned value code rule', () => {
        const input = leftAlign(`
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * status = #final
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode('final').withLocation([6, 12, 6, 17]).withFile('');
        assertAssignmentRule(profile.rules[0], 'status', expectedCode);
      });

      it('should parse assigned value CodeableConcept rule', () => {
        const input = leftAlign(`
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * valueCodeableConcept = LOINC#718-7 "Hemoglobin [Mass/volume] in Blood"
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode(
          '718-7',
          'http://loinc.org',
          'Hemoglobin [Mass/volume] in Blood'
        )
          .withLocation([6, 26, 6, 72])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueCodeableConcept', expectedCode);
      });

      it('should parse assigned value CodeableConcept rule with (exactly) modifier', () => {
        const input = leftAlign(`
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * valueCodeableConcept = LOINC#718-7 "Hemoglobin [Mass/volume] in Blood" (exactly)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode(
          '718-7',
          'http://loinc.org',
          'Hemoglobin [Mass/volume] in Blood'
        )
          .withLocation([6, 26, 6, 72])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueCodeableConcept', expectedCode, true);
      });

      it('should parse an assigned value FSHCode rule with units on Quantity', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = http://unitsofmeasure.org#cGy
        `);

        const result = importSingleText(input, 'UselessUnits.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode('cGy', 'http://unitsofmeasure.org')
          .withLocation([4, 19, 4, 47])
          .withFile('UselessUnits.fsh');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedCode);
      });

      it('should log an error when parsing an assigned value FSHCode rule using the unit keyword', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity units = http://unitsofmeasure.org#cGy
        `);

        const result = importSingleText(input, 'Deprecated.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'units' keyword is no longer supported.*File: Deprecated\.fsh.*Line: 4\D*/s
        );
      });

      it('should parse assigned value Quantity rule', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = 1.5 'mm'
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedQuantity = new FshQuantity(
          1.5,
          new FshCode('mm', 'http://unitsofmeasure.org').withLocation([5, 23, 5, 26]).withFile('')
        )
          .withLocation([5, 19, 5, 26])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedQuantity);
      });

      it('should parse assigned value Quantity rule with unit display', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = 155.0 '[lb_av]' "lb"
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedQuantity = new FshQuantity(
          155.0,
          new FshCode('[lb_av]', 'http://unitsofmeasure.org', 'lb')
            .withLocation([5, 25, 5, 33])
            .withFile('')
        )
          .withLocation([5, 19, 5, 38])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedQuantity);
      });

      it('should parse assigned value Ratio rule', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1 'dL'
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(
            130,
            new FshCode('mg', 'http://unitsofmeasure.org').withLocation([5, 20, 5, 23]).withFile('')
          )
            .withLocation([5, 16, 5, 23])
            .withFile(''),
          new FshQuantity(
            1,
            new FshCode('dL', 'http://unitsofmeasure.org').withLocation([5, 29, 5, 32]).withFile('')
          )
            .withLocation([5, 27, 5, 32])
            .withFile('')
        )
          .withLocation([5, 16, 5, 32])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric numerator', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1 'dL'
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(130).withLocation([5, 16, 5, 18]).withFile(''),
          new FshQuantity(
            1,
            new FshCode('dL', 'http://unitsofmeasure.org').withLocation([5, 24, 5, 27]).withFile('')
          )
            .withLocation([5, 22, 5, 27])
            .withFile('')
        )
          .withLocation([5, 16, 5, 27])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric denominator', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(
            130,
            new FshCode('mg', 'http://unitsofmeasure.org').withLocation([5, 20, 5, 23]).withFile('')
          )
            .withLocation([5, 16, 5, 23])
            .withFile(''),
          new FshQuantity(1).withLocation([5, 27, 5, 27]).withFile('')
        )
          .withLocation([5, 16, 5, 27])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric numerator and denominator', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(130).withLocation([5, 16, 5, 18]).withFile(''),
          new FshQuantity(1).withLocation([5, 22, 5, 22]).withFile('')
        )
          .withLocation([5, 16, 5, 22])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Reference rule', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(fooProfile)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile')
          .withLocation([5, 13, 5, 33])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rules while allowing and translating aliases', () => {
        const input = leftAlign(`
        Alias: FOO = http://hl7.org/fhir/StructureDefinition/Foo

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(FOO) "bar"
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference(
          'http://hl7.org/fhir/StructureDefinition/Foo',
          'bar'
        )
          .withLocation([6, 13, 6, 32])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rule with a display string', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(fooProfile) "bar"
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile', 'bar')
          .withLocation([5, 13, 5, 39])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rule with whitespace', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(   fooProfile   )
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile')
          .withLocation([5, 13, 5, 39])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should log an error when an assigned value Reference rule has a choice of references', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(cakeProfile or pieProfile)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('cakeProfile')
          .withLocation([5, 13, 5, 48])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Multiple choices of references are not allowed when setting a value.*Line: 5\D*/s
        );
      });

      it('should parse assigned value using Canonical', () => {
        const input = leftAlign(`
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(Example)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 24, 8, 41])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with spaces around entity name', () => {
        const input = leftAlign(`
        CodeSystem: SpaceyExample
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(   SpaceyExample )
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('SpaceyExample') // No spaces are included in the entityName
          .withLocation([8, 24, 8, 51])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with a version', () => {
        const input = leftAlign(`
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(Example|1.2.3)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 24, 8, 47])
          .withFile('');
        expectedCanonical.version = '1.2.3';
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with a version which contains a |', () => {
        const input = leftAlign(`
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(  Example|1.2.3|aWeirdVersion  )
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 24, 8, 65])
          .withFile('');
        expectedCanonical.version = '1.2.3|aWeirdVersion';
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should log an error when an assigned value Canonical rule has a choice of canonicals', () => {
        const input = leftAlign(`
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(Example or OtherExample)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 24, 8, 57])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Multiple choices of canonicals are not allowed when setting a value.*Line: 8\D*/s
        );
      });

      it('should parse assigned values that are an alias', () => {
        const input = leftAlign(`
        Alias: EXAMPLE = http://example.org

        Profile: PatientProfile
        Parent: Patient
        * identifier.system = EXAMPLE
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('PatientProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'identifier.system', 'http://example.org');
      });

      it('should parse an assigned value Resource rule', () => {
        const input = leftAlign(`

        Profile: ObservationProfile
        Parent: Observation
        * contained[0] = SomeInstance
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'contained[0]', 'SomeInstance', false, true);
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only Quantity
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'value[x]', { type: 'Quantity' });
      });

      it('should parse an only rule with multiple types', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only Quantity or CodeableConcept or string
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'value[x]',
          { type: 'Quantity' },
          { type: 'CodeableConcept' },
          { type: 'string' }
        );
      });

      it('should parse an only rule with one numeric type name', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only 123
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'value[x]', { type: '123' });
      });

      it('should parse an only rule with multiple numeric type names', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only 123 or 456 or 789
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'value[x]',
          { type: '123' },
          { type: '456' },
          { type: '789' }
        );
      });

      it('should parse an only rule with a reference to one type', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Practitioner)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'performer', { type: 'Practitioner', isReference: true });
      });

      it('should parse an only rule with a reference to multiple types', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Organization or CareTeam)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'performer',
          { type: 'Organization', isReference: true },
          { type: 'CareTeam', isReference: true }
        );
      });

      it('should parse an only rule with a reference to multiple types with whitespace', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(   Organization    or  CareTeam)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'performer',
          { type: 'Organization', isReference: true },
          { type: 'CareTeam', isReference: true }
        );
      });

      it('should parse an only rule with a canonical to one type', () => {
        const input = leftAlign(`
        Profile: PlanDefinitionProfile
        Parent: PlanDefinition
        * action.definition[x] only Canonical(ActivityDefinition)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('PlanDefinitionProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'action.definition[x]', {
          type: 'ActivityDefinition',
          isCanonical: true
        });
      });

      it('should parse an only rule with a canonical to multiple types', () => {
        const input = leftAlign(`
        Profile: PlanDefinitionProfile
        Parent: PlanDefinition
        * action.definition[x] only Canonical(ActivityDefinition or PlanDefinition)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('PlanDefinitionProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'action.definition[x]',
          { type: 'ActivityDefinition', isCanonical: true },
          { type: 'PlanDefinition', isCanonical: true }
        );
      });

      it('should parse an only rule with a canonical to multiple types with whitespace', () => {
        const input = leftAlign(`
        Profile: PlanDefinitionProfile
        Parent: PlanDefinition
        * action.definition[x] only Canonical(     ActivityDefinition   or    PlanDefinition    )
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('PlanDefinitionProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'action.definition[x]',
          { type: 'ActivityDefinition', isCanonical: true },
          { type: 'PlanDefinition', isCanonical: true }
        );
      });

      it('should parse an only rule with a canonical to multiple types with versions', () => {
        const input = leftAlign(`
        Profile: PlanDefinitionProfile
        Parent: PlanDefinition
        * action.definition[x] only Canonical(ActivityDefinition|4.0.1 or PlanDefinition|4.0.1)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('PlanDefinitionProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'action.definition[x]',
          { type: 'ActivityDefinition|4.0.1', isCanonical: true },
          { type: 'PlanDefinition|4.0.1', isCanonical: true }
        );
      });

      it('should allow and translate aliases for only types', () => {
        const input = leftAlign(`
        Alias: QUANTITY = http://hl7.org/fhir/StructureDefinition/Quantity
        Alias: CODING = http://hl7.org/fhir/StructureDefinition/Coding

        Profile: ObservationProfile
        Parent: Observation
        * value[x] only CodeableConcept or CODING or string or QUANTITY
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'value[x]',
          { type: 'CodeableConcept' },
          { type: 'http://hl7.org/fhir/StructureDefinition/Coding' },
          { type: 'string' },
          { type: 'http://hl7.org/fhir/StructureDefinition/Quantity' }
        );
      });

      it('should log an error when references are listed with pipes', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Organization | CareTeam)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Using '\|' to list references is no longer supported\..*Line: 4\D*/s
        );
      });

      it('should log an error when references are listed with pipes with whitespace', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(   Organization  |   CareTeam)
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Using '\|' to list references is no longer supported\..*Line: 4\D*/s
        );
      });
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one item', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
      });

      it('should parse contains rule with one item declaring an aliased type', () => {
        const input = leftAlign(`
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains OffsetExtension named offset 0..1
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component.extension', {
          name: 'offset',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-timeOffset'
        });
        assertCardRule(profile.rules[1], 'component.extension[offset]', 0, 1);
      });

      it('should parse contains rule with one item declaring an FSH extension type', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains ComponentExtension named compext 0..1

        Extension: ComponentExtension
        Id: component-extension
        * value[x] only CodeableConcept
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component.extension', {
          name: 'compext',
          type: 'ComponentExtension'
        });
        assertCardRule(profile.rules[1], 'component.extension[compext]', 0, 1);
      });

      it('should parse contains rules with multiple items', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 and DiastolicBP 2..*
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP', 'DiastolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
        assertCardRule(profile.rules[2], 'component[DiastolicBP]', 2, '*');
      });

      it('should parse contains rule with mutliple items, some declaring types', () => {
        const input = leftAlign(`
        Alias: FocusCodeExtension = http://hl7.org/fhir/StructureDefinition/observation-focusCode
        Alias: PreconditionExtension = http://hl7.org/fhir/StructureDefinition/observation-precondition
        Profile: ObservationProfile
        Parent: Observation
        * extension contains
            foo 0..1 and
            FocusCodeExtension named focus 1..1 and
            bar 0..* and
            PreconditionExtension named pc 1..*
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertContainsRule(
          profile.rules[0],
          'extension',
          'foo',
          {
            name: 'focus',
            type: 'http://hl7.org/fhir/StructureDefinition/observation-focusCode'
          },
          'bar',
          {
            name: 'pc',
            type: 'http://hl7.org/fhir/StructureDefinition/observation-precondition'
          }
        );
        assertCardRule(profile.rules[1], 'extension[foo]', 0, 1);
        assertCardRule(profile.rules[2], 'extension[focus]', 1, 1);
        assertCardRule(profile.rules[3], 'extension[bar]', 0, '*');
        assertCardRule(profile.rules[4], 'extension[pc]', 1, '*');
      });

      it('should parse contains rules with flags', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 MS D and DiastolicBP 2..* MS SU
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP', 'DiastolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
        assertFlagRule(
          profile.rules[2],
          'component[SystolicBP]',
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
        assertCardRule(profile.rules[3], 'component[DiastolicBP]', 2, '*');
        assertFlagRule(
          profile.rules[4],
          'component[DiastolicBP]',
          true,
          true,
          undefined,
          undefined,
          undefined,
          undefined
        );
      });

      it('should parse contains rule with item declaring a type and flags', () => {
        const input = leftAlign(`
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains OffsetExtension named offset 0..1 MS TU
        `);

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertContainsRule(profile.rules[0], 'component.extension', {
          name: 'offset',
          type: 'http://hl7.org/fhir/StructureDefinition/observation-timeOffset'
        });
        assertCardRule(profile.rules[1], 'component.extension[offset]', 0, 1);
        assertFlagRule(
          profile.rules[2],
          'component.extension[offset]',
          true,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
      });
    });

    describe('#caretValueRule', () => {
      it('should parse caret value rules with no path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * ^description = "foo"
        * ^experimental = false
        * ^keyword[0] = foo#bar "baz"
        `);
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '', 'description', 'foo', false);
        assertCaretValueRule(profile.rules[1], '', 'experimental', false, false);
        assertCaretValueRule(
          profile.rules[2],
          '',
          'keyword[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 17, 6, 29]).withFile(''),
          false
        );
      });

      it('should parse caret value rules with a . path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * . ^definition = "foo"
        `);
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '.', 'definition', 'foo', false, ['.']);
      });

      it('should parse caret value rules with a path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * status ^short = "foo"
        * status ^sliceIsConstraining = false
        * status ^code[0] = foo#bar "baz"
        `);
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], 'status', 'short', 'foo', false);
        assertCaretValueRule(profile.rules[1], 'status', 'sliceIsConstraining', false, false);
        assertCaretValueRule(
          profile.rules[2],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 21, 6, 33]).withFile(''),
          false
        );
      });

      it('should not include non-breaking spaces as part of the caret path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * status ^short\u00A0= "Non-breaking"
        `);
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], 'status', 'short', 'Non-breaking', false);
      });

      it('should add resources to the contained array using a CaretValueRule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * ^contained = myResource
        `);
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '', 'contained', 'myResource', true);
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with one invariant and no path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * obeys SomeInvariant
        `);
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], '', 'SomeInvariant');
      });

      it('should parse an obeys rule with one invariant and a path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category obeys SomeInvariant
        `);
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], 'category', 'SomeInvariant');
      });

      it('should parse an obeys rule with multiple invariants and no path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * obeys SomeInvariant and ThisInvariant and ThatInvariant
        `);
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertObeysRule(profile.rules[0], '', 'SomeInvariant');
        assertObeysRule(profile.rules[1], '', 'ThisInvariant');
        assertObeysRule(profile.rules[2], '', 'ThatInvariant');
      });

      it('should parse an obeys rule with multiple invariants and a path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * category obeys SomeInvariant and ThisInvariant and ThatInvariant
        `);
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertObeysRule(profile.rules[0], 'category', 'SomeInvariant');
        assertObeysRule(profile.rules[1], 'category', 'ThisInvariant');
        assertObeysRule(profile.rules[2], 'category', 'ThatInvariant');
      });

      it('should parse an obeys rule with a numeric invariant name', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * obeys 123
        `);
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], '', '123');
      });
    });

    describe('#pathRule', () => {
      it('should parse a pathRule', () => {
        const input = leftAlign(`
        Profile: PatientProfile
        Parent: Patient
        * name
        `);
        const result = importSingleText(input, 'Path.fsh');
        const profile = result.profiles.get('PatientProfile');
        expect(profile.rules).toHaveLength(0);
      });
    });

    describe('#insertRule', () => {
      let importer: FSHImporter;

      beforeEach(() => {
        // To explain a bit about why stats are used here and not in other tests:
        // When parsing generated documents, the logging level is temporarily raised
        // in order to suppress console output. However, messages still go to the logger
        // and therefore are detected by loggerSpy. However, the stats should provide an
        // accurate reflection of the number of times that errors and warnings were logged
        // while the logger is at the normal level.
        loggerSpy.reset();
        stats.reset();
        importer = new FSHImporter();
        // RuleSet: OneParamRuleSet (val)
        // * status = {val}
        const oneParamRuleSet = new ParamRuleSet('OneParamRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([1, 12, 2, 27]);
        oneParamRuleSet.parameters = ['val'];
        oneParamRuleSet.contents = '* status = {val}';
        importer.paramRuleSets.set(oneParamRuleSet.name, oneParamRuleSet);
        // RuleSet: MultiParamRuleSet (status, value, maxNote)
        // * status = {status}
        // * valueString = {value}
        // * note 0..{maxNote}
        const multiParamRuleSet = new ParamRuleSet('MultiParamRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([4, 12, 7, 30]);
        multiParamRuleSet.parameters = ['status', 'value', 'maxNote'];
        multiParamRuleSet.contents = [
          '* status = {status}',
          '* valueString = {value}',
          '* note 0..{maxNote}'
        ].join(EOL);
        importer.paramRuleSets.set(multiParamRuleSet.name, multiParamRuleSet);
        // RuleSet: EntryRules (continuation)
        // * insert {continuation}Rules (5)
        const entryRules = new ParamRuleSet('EntryRules')
          .withFile('RuleSet.fsh')
          .withLocation([9, 12, 10, 43]);
        entryRules.parameters = ['continuation'];
        entryRules.contents = '* insert {continuation}Rules (5)';
        importer.paramRuleSets.set(entryRules.name, entryRules);
        // RuleSet: RecursiveRules (value)
        // * interpretation 0..{value}
        // * insert EntryRules (BaseCase)
        const recursiveRules = new ParamRuleSet('RecursiveRules')
          .withFile('RuleSet.fsh')
          .withLocation([12, 12, 14, 41]);
        recursiveRules.parameters = ['value'];
        recursiveRules.contents = [
          '* interpretation 0..{value}',
          '* insert EntryRules (BaseCase)'
        ].join(EOL);
        importer.paramRuleSets.set(recursiveRules.name, recursiveRules);
        // RuleSet: BaseCaseRules (value)
        // * note 0..{value}
        const baseCaseRules = new ParamRuleSet('BaseCaseRules')
          .withFile('RuleSet.fsh')
          .withLocation([16, 12, 17, 28]);
        baseCaseRules.parameters = ['value'];
        baseCaseRules.contents = '* note 0..{value}';
        importer.paramRuleSets.set(baseCaseRules.name, baseCaseRules);
        // RuleSet: CardRuleSet (path, min, max)
        // * {path} {min}..{max}
        // * note {min}..{max}
        const cardRuleSet = new ParamRuleSet('CardRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([19, 12, 21, 30]);
        cardRuleSet.parameters = ['path', 'min', 'max'];
        cardRuleSet.contents = ['* {path} {min}..{max}', '* note {min}..{max}'].join(EOL);
        importer.paramRuleSets.set(cardRuleSet.name, cardRuleSet);
        // RuleSet: FirstRiskyRuleSet (value)
        // * note ={value}
        // * insert SecondRiskyRuleSet({value})
        const firstRiskyRuleSet = new ParamRuleSet('FirstRiskyRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([23, 12, 25, 47]);
        firstRiskyRuleSet.parameters = ['value'];
        firstRiskyRuleSet.contents = [
          '* note ={value}',
          '* insert SecondRiskyRuleSet({value})'
        ].join(EOL);
        importer.paramRuleSets.set(firstRiskyRuleSet.name, firstRiskyRuleSet);
        // RuleSet: SecondRiskyRuleSet(value)
        // * status ={value}
        const secondRiskyRuleSet = new ParamRuleSet('SecondRiskyRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([27, 12, 28, 28]);
        secondRiskyRuleSet.parameters = ['value'];
        secondRiskyRuleSet.contents = '* status ={value}';
        importer.paramRuleSets.set(secondRiskyRuleSet.name, secondRiskyRuleSet);
        // RuleSet: WarningRuleSet(value)
        // * focus[0] only Reference(Patient | {value})
        // * focus[1] only Reference(Group | {value})
        // NOTE: This now causes ERRORS (not warnings), so associated test is skipped!
        const warningRuleSet = new ParamRuleSet('WarningRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([30, 12, 32, 53]);
        warningRuleSet.parameters = ['value'];
        warningRuleSet.contents = [
          '* focus[0] only Reference(Patient | {value})',
          '* focus[1] only Reference(Group | {value})'
        ].join(EOL);
        importer.paramRuleSets.set(warningRuleSet.name, warningRuleSet);
        // RuleSet: TopLevelRules (status, value, identifier)
        // * status = {status}
        // * insert NestedRules([[{value}]])
        // * identifier.value = {identifier}
        const topLevelRules = new ParamRuleSet('TopLevelRules')
          .withFile('RuleSet.fsh')
          .withLocation([34, 12, 37, 44]);
        topLevelRules.parameters = ['status', 'value', 'identifier'];
        topLevelRules.contents = [
          '* status = {status}',
          '* insert NestedRules([[{value}]])',
          '* identifier.value = {identifier}'
        ].join(EOL);
        importer.paramRuleSets.set(topLevelRules.name, topLevelRules);
        // RuleSet: NestedRules(value)
        // * valueString = {value}
        const nestedRules = new ParamRuleSet('NestedRules')
          .withFile('RuleSet.fsh')
          .withLocation([39, 12, 40, 34]);
        nestedRules.parameters = ['value'];
        nestedRules.contents = '* valueString = {value}';
        importer.paramRuleSets.set(nestedRules.name, nestedRules);
        // RuleSet: QuotedValueRules(value)
        // * valueString = "START{value}END"
        const quotedRules = new ParamRuleSet('QuotedValueRules')
          .withFile('RuleSet.fsh')
          .withLocation([42, 12, 43, 44]);
        quotedRules.parameters = ['value'];
        quotedRules.contents = '* valueString = "START{value}END"';
        importer.paramRuleSets.set(quotedRules.name, quotedRules);
        // RuleSet: AboveQuotedRules(value)
        // * insert QuotedValueRules([[ begin here {value} end here ]])
        const aboveQuotedRules = new ParamRuleSet('AboveQuotedRules')
          .withFile('RuleSet.fsh')
          .withLocation([45, 12, 46, 61]);
        aboveQuotedRules.parameters = ['value'];
        aboveQuotedRules.contents = '* insert QuotedValueRules([[ begin here {value} end here ]])';
        importer.paramRuleSets.set(aboveQuotedRules.name, aboveQuotedRules);
      });

      it('should parse an insert rule with a single RuleSet', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MyRuleSet
        `);
        const result = importSingleText(input, 'Insert.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MyRuleSet');
      });

      it('should parse an insert rule with a single RuleSet and a path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * code insert MyRuleSet
        `);
        const result = importSingleText(input, 'Insert.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'code', 'MyRuleSet');
      });

      it('should parse an insert rule with a RuleSet with one parameter', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'OneParamRuleSet', ['#final']);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['OneParamRuleSet', '#final'])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 1,
            startColumn: 12,
            endLine: 2,
            endColumn: 27
          }
        });
        expect(appliedRuleSet.rules[0].sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 17
          }
        });
      });

      it('should parse an insert rule with a RuleSet with one parameter and a path', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * code insert OneParamRuleSet (#final)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'code', 'OneParamRuleSet', ['#final']);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['OneParamRuleSet', '#final'])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 1,
            startColumn: 12,
            endLine: 2,
            endColumn: 27
          }
        });
        expect(appliedRuleSet.rules[0].sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 17
          }
        });
      });

      it('should parse an insert rule with a RuleSet with multiple parameters', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#preliminary, "this is a string value\\, right?", 4)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#preliminary',
          '"this is a string value, right?"',
          '4'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify([
            'MultiParamRuleSet',
            '#preliminary',
            '"this is a string value, right?"',
            '4'
          ])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 4,
            startColumn: 12,
            endLine: 7,
            endColumn: 30
          }
        });
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('preliminary').withFile('Insert.fsh').withLocation([2, 12, 2, 23]),
          false,
          false
        );
        expect(appliedRuleSet.rules[0].sourceInfo.file).toBe('RuleSet.fsh');
        expect(appliedRuleSet.rules[0].sourceInfo.location.startLine).toBe(5);
        expect(appliedRuleSet.rules[0].sourceInfo.location.endLine).toBe(5);
        assertAssignmentRule(
          appliedRuleSet.rules[1],
          'valueString',
          'this is a string value, right?',
          false,
          false
        );
        expect(appliedRuleSet.rules[1].sourceInfo.file).toBe('RuleSet.fsh');
        expect(appliedRuleSet.rules[1].sourceInfo.location.startLine).toBe(6);
        expect(appliedRuleSet.rules[1].sourceInfo.location.endLine).toBe(6);
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '4');
        expect(appliedRuleSet.rules[2].sourceInfo.file).toBe('RuleSet.fsh');
        expect(appliedRuleSet.rules[2].sourceInfo.location.startLine).toBe(7);
        expect(appliedRuleSet.rules[2].sourceInfo.location.endLine).toBe(7);
      });

      it('should parse an insert rule with a parameter that contains right parenthesis', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final "(Final\\)")
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'OneParamRuleSet', ['#final "(Final)"']);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['OneParamRuleSet', '#final "(Final)"'])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.rules).toHaveLength(1);
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 1,
            startColumn: 12,
            endLine: 2,
            endColumn: 27
          }
        });
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final', undefined, '(Final)')
            .withFile('Insert.fsh')
            .withLocation([2, 12, 2, 27]),
          false,
          false
        );
      });

      it('should parse an insert rule with parameters that contain newline, tab, or backslash characters', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#final, "very\\nstrange\\rvalue\\\\\\tindeed", 1)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#final',
          '"very\\nstrange\\rvalue\\\\\\tindeed"',
          '1'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify([
            'MultiParamRuleSet',
            '#final',
            '"very\\nstrange\\rvalue\\\\\\tindeed"',
            '1'
          ])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 4,
            startColumn: 12,
            endLine: 7,
            endColumn: 30
          }
        });
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertAssignmentRule(
          appliedRuleSet.rules[1],
          'valueString',
          'very\nstrange\rvalue\\\tindeed',
          false,
          false
        );
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '1');
      });

      it('should parse an insert rule with parameters surrounded by double square brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert TopLevelRules(#final, [["fruits (apples, oranges, etc.)"]], [["identify me"]])
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'TopLevelRules', [
          '#final',
          '"fruits (apples, oranges, etc.)"',
          '"identify me"'
        ]);
        const appliedTopLevelRules = doc.appliedRuleSets.get(
          JSON.stringify([
            'TopLevelRules',
            '#final',
            '"fruits (apples, oranges, etc.)"',
            '"identify me"'
          ])
        );
        expect(appliedTopLevelRules).toBeDefined();
        expect(appliedTopLevelRules.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedTopLevelRules.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertInsertRule(appliedTopLevelRules.rules[1], '', 'NestedRules', [
          '"fruits (apples, oranges, etc.)"'
        ]);
        assertAssignmentRule(
          appliedTopLevelRules.rules[2],
          'identifier.value',
          'identify me',
          false,
          false
        );
        const appliedNestedRules = doc.appliedRuleSets.get(
          JSON.stringify(['NestedRules', '"fruits (apples, oranges, etc.)"'])
        );
        expect(appliedNestedRules).toBeDefined();
        expect(appliedNestedRules.rules).toHaveLength(1);
        assertAssignmentRule(
          appliedNestedRules.rules[0],
          'valueString',
          'fruits (apples, oranges, etc.)',
          false,
          false
        );
      });

      it('should parse an insert rule with parameters containing a literal backslash followed by a comma, surrounded by double square brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert TopLevelRules(#final, [["this is strange]]\\\\, please understand"]], [["identify me"]])
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'TopLevelRules', [
          '#final',
          '"this is strange]]\\\\, please understand"',
          '"identify me"'
        ]);
        const appliedTopLevelRules = doc.appliedRuleSets.get(
          JSON.stringify([
            'TopLevelRules',
            '#final',
            '"this is strange]]\\\\, please understand"',
            '"identify me"'
          ])
        );
        expect(appliedTopLevelRules).toBeDefined();
        expect(appliedTopLevelRules.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedTopLevelRules.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertInsertRule(appliedTopLevelRules.rules[1], '', 'NestedRules', [
          '"this is strange]]\\\\, please understand"'
        ]);
        assertAssignmentRule(
          appliedTopLevelRules.rules[2],
          'identifier.value',
          'identify me',
          false,
          false
        );
        const appliedNestedRules = doc.appliedRuleSets.get(
          JSON.stringify(['NestedRules', '"this is strange]]\\\\, please understand"'])
        );
        expect(appliedNestedRules).toBeDefined();
        expect(appliedNestedRules.rules).toHaveLength(1);
        assertAssignmentRule(
          appliedNestedRules.rules[0],
          'valueString',
          'this is strange]]\\, please understand',
          false,
          false
        );
      });

      it('should parse an insert rule with parameters containing double closing square brackets surrounded by double square brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet(#final, [["this is strange]]\\, please understand"]], 7)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#final',
          '"this is strange]], please understand"',
          '7'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify([
            'MultiParamRuleSet',
            '#final',
            '"this is strange]], please understand"',
            '7'
          ])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertAssignmentRule(
          appliedRuleSet.rules[1],
          'valueString',
          'this is strange]], please understand',
          false,
          false
        );
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '7');
      });

      it('should parse an insert rule with parameters containing a literal backslash surrounded by square brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet(#final, [["a literal\\\\backslash character, really?"]], 7)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#final',
          '"a literal\\\\backslash character, really?"',
          '7'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify([
            'MultiParamRuleSet',
            '#final',
            '"a literal\\\\backslash character, really?"',
            '7'
          ])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertAssignmentRule(
          appliedRuleSet.rules[1],
          'valueString',
          'a literal\\backslash character, really?',
          false,
          false
        );
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '7');
      });

      it('should parse an insert rule with parameters containing a literal backslash followed by a comma, surrounded by square brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet(#final, [["a literal\\\\,backslash character, really?"]], 7)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#final',
          '"a literal\\\\,backslash character, really?"',
          '7'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify([
            'MultiParamRuleSet',
            '#final',
            '"a literal\\\\,backslash character, really?"',
            '7'
          ])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertAssignmentRule(
          appliedRuleSet.rules[1],
          'valueString',
          'a literal\\,backslash character, really?',
          false,
          false
        );
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '7');
      });

      it('should apply the correct value to a nested insert rule when the substitution token is surrounded by double brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert TopLevelRules(#final, [["will need [[to escape]]\\, again"]], "identify me")
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'TopLevelRules', [
          '#final',
          '"will need [[to escape]], again"',
          '"identify me"'
        ]);
        const appliedTopLevelRules = doc.appliedRuleSets.get(
          JSON.stringify([
            'TopLevelRules',
            '#final',
            '"will need [[to escape]], again"',
            '"identify me"'
          ])
        );
        expect(appliedTopLevelRules).toBeDefined();
        expect(appliedTopLevelRules.rules).toHaveLength(3);
        assertInsertRule(appliedTopLevelRules.rules[1], '', 'NestedRules', [
          '"will need [[to escape]], again"'
        ]);
        assertAssignmentRule(
          appliedTopLevelRules.rules[2],
          'identifier.value',
          'identify me',
          false,
          false
        );
        const appliedNestedRules = doc.appliedRuleSets.get(
          JSON.stringify(['NestedRules', '"will need [[to escape]], again"'])
        );
        expect(appliedNestedRules).toBeDefined();
        expect(appliedNestedRules.rules).toHaveLength(1);
        assertAssignmentRule(
          appliedNestedRules.rules[0],
          'valueString',
          'will need [[to escape]], again',
          false,
          false
        );
      });

      it('should apply the correct value to a nested insert rule when the substitution token is with other contents inside double brackets', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert AboveQuotedRules([[(ah]]\\), yes]]\\, good]]\\)!]])
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'AboveQuotedRules', ['(ah]]), yes]], good]])!']);
        const appliedAboveQuotedRules = doc.appliedRuleSets.get(
          JSON.stringify(['AboveQuotedRules', '(ah]]), yes]], good]])!'])
        );
        expect(appliedAboveQuotedRules).toBeDefined();
        expect(appliedAboveQuotedRules.rules).toHaveLength(1);
        assertInsertRule(appliedAboveQuotedRules.rules[0], '', 'QuotedValueRules', [
          ' begin here (ah]]), yes]], good]])! end here '
        ]);
        const appliedQuotedValueRules = doc.appliedRuleSets.get(
          JSON.stringify(['QuotedValueRules', ' begin here (ah]]), yes]], good]])! end here '])
        );
        expect(appliedQuotedValueRules).toBeDefined();
        expect(appliedQuotedValueRules.rules).toHaveLength(1);
        assertAssignmentRule(
          appliedQuotedValueRules.rules[0],
          'valueString',
          'START begin here (ah]]), yes]], good]])! end here END',
          false,
          false
        );
      });

      it('should keep starting and ending space characters inside brackets when applying an insert rule', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert QuotedValueRules([[ and then, ]])
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'QuotedValueRules', [' and then, ']);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['QuotedValueRules', ' and then, '])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.rules).toHaveLength(1);
        assertAssignmentRule(appliedRuleSet.rules[0], 'valueString', 'START and then, END');
      });

      it('should parse an insert rule that separates its parameters onto multiple lines', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (
          #final,
          "string value",
          7
        )
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#final',
          '"string value"',
          '7'
        ]);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['MultiParamRuleSet', '#final', '"string value"', '7'])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 4,
            startColumn: 12,
            endLine: 7,
            endColumn: 30
          }
        });
        expect(appliedRuleSet.rules).toHaveLength(3);
        assertAssignmentRule(
          appliedRuleSet.rules[0],
          'status',
          new FshCode('final').withFile('Insert.fsh').withLocation([2, 12, 2, 17]),
          false,
          false
        );
        assertAssignmentRule(appliedRuleSet.rules[1], 'valueString', 'string value', false, false);
        assertCardRule(appliedRuleSet.rules[2], 'note', 0, '7');
      });

      it('should generate a RuleSet only once when inserted with the same parameters multiple times in the same document', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#preliminary, "something", 3)
        * insert MultiParamRuleSet (#preliminary, "something", 3)
        `);
        const visitDocSpy = jest.spyOn(importer, 'visitDoc');
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        expect(doc.appliedRuleSets.size).toBe(1);
        // expect one call to visitDoc for the Profile, and one for the generated RuleSet
        expect(visitDocSpy).toHaveBeenCalledTimes(2);
        // ensure the insert rules are still there (once upon a time, a bug caused the repeated rules to be omitted)
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile).toBeDefined();
        expect(profile.rules).toHaveLength(2);
        assertInsertRule(profile.rules[0], '', 'MultiParamRuleSet', [
          '#preliminary',
          '"something"',
          '3'
        ]);
        assertInsertRule(profile.rules[1], '', 'MultiParamRuleSet', [
          '#preliminary',
          '"something"',
          '3'
        ]);
      });

      it('should parse an insert rule with parameters that will use the same RuleSet more than once with different parameters each time', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert EntryRules (Recursive)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        expect(doc.appliedRuleSets.size).toBe(4);

        const firstEntryRules = doc.appliedRuleSets.get(
          JSON.stringify(['EntryRules', 'Recursive'])
        );
        expect(firstEntryRules).toBeDefined();
        expect(firstEntryRules.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 9,
            startColumn: 12,
            endLine: 10,
            endColumn: 43
          }
        });
        expect(firstEntryRules.rules).toHaveLength(1);
        assertInsertRule(firstEntryRules.rules[0], '', 'RecursiveRules', ['5']);

        const recursiveRules = doc.appliedRuleSets.get(JSON.stringify(['RecursiveRules', '5']));
        expect(recursiveRules).toBeDefined();
        expect(recursiveRules.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 12,
            startColumn: 12,
            endLine: 14,
            endColumn: 41
          }
        });
        expect(recursiveRules.rules).toHaveLength(2);
        assertCardRule(recursiveRules.rules[0], 'interpretation', 0, '5');
        assertInsertRule(recursiveRules.rules[1], '', 'EntryRules', ['BaseCase']);

        const secondEntryRules = doc.appliedRuleSets.get(
          JSON.stringify(['EntryRules', 'BaseCase'])
        );
        expect(secondEntryRules.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 9,
            startColumn: 12,
            endLine: 10,
            endColumn: 43
          }
        });
        expect(secondEntryRules.rules).toHaveLength(1);
        assertInsertRule(secondEntryRules.rules[0], '', 'BaseCaseRules', ['5']);

        const baseCaseRules = doc.appliedRuleSets.get(JSON.stringify(['BaseCaseRules', '5']));
        expect(baseCaseRules).toBeDefined();
        expect(baseCaseRules.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 16,
            startColumn: 12,
            endLine: 17,
            endColumn: 28
          }
        });
        expect(baseCaseRules.rules).toHaveLength(1);
        assertCardRule(baseCaseRules.rules[0], 'note', 0, '5');
      });

      it('should log an error and not add a rule when an insert rule has the wrong number of parameters', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final, "Final")
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(0);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Incorrect number of parameters applied to RuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log an error and not add a rule when an insert rule with parameters refers to an undefined parameterized RuleSet', () => {
        const input = leftAlign(`
        Profile: ObservationProfile
        Parent: Observation
        * insert MysteriousRuleSet ("mystery")
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(0);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Could not find parameterized RuleSet named MysteriousRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log an error when an insert rule with parameters results in a parser error in the generated RuleSet', () => {
        const input = leftAlign(`
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(path with spaces, 1, *)
        `);
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Error parsing insert rule with parameterized RuleSet CardRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log one error when nested insert rules with parameters result in multiple parser errors in the generated RuleSets', () => {
        const input = leftAlign(`
        Profile: MyObservation
        Parent: Observation
        * note 0..1
        * insert FirstRiskyRuleSet("Observation.id")
        `);
        importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Error parsing insert rule with parameterized RuleSet FirstRiskyRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 5/s);
      });

      it('should not log an error when an insert rule with parameters results in rules that are syntactically correct but semantically invalid', () => {
        const input = leftAlign(`
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(nonExistentPath, 7, 4)
        `);
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];

        expect(doc.appliedRuleSets.size).toBe(1);
        const appliedRuleSet = doc.appliedRuleSets.get(
          JSON.stringify(['CardRuleSet', 'nonExistentPath', '7', '4'])
        );
        expect(appliedRuleSet).toBeDefined();
        expect(appliedRuleSet.sourceInfo).toEqual({
          file: 'RuleSet.fsh',
          location: {
            startLine: 19,
            startColumn: 12,
            endLine: 21,
            endColumn: 30
          }
        });
        // This rule is nonsense, of course, but figuring that out is the job of the exporter, not the importer.
        assertCardRule(appliedRuleSet.rules[0], 'nonExistentPath', 7, '4');
        assertCardRule(appliedRuleSet.rules[1], 'note', 7, '4');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });

      // Skipping the following rule because SUSHI no longer has any warnings associated w/ parsing rules.
      // All deprecated syntaxes are now errors (not warnings).  We can re-enable if/when the importer
      // produces warnings on rules.
      it.skip('should log one warning when an insert rule with parameters results in warnings', () => {
        const input = leftAlign(`
        Profile: MyObservation
        Parent: Observation
        * insert WarningRuleSet(Device)
        `);
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numWarn).toBe(1);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Warnings parsing insert rule with parameterized RuleSet WarningRuleSet/s
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log one error when an insert rule with parameters results in non-parser errors', () => {
        const input = leftAlign(`
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(nonExistentPath, , )
        `);
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Errors parsing insert rule with parameterized RuleSet CardRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });
    });
  });
});
