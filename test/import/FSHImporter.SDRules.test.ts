import {
  assertCardRule,
  assertAssignmentRule,
  assertFlagRule,
  assertOnlyRule,
  assertBindingRule,
  assertContainsRule,
  assertCaretValueRule,
  assertObeysRule,
  assertInsertRule,
  assertAddElementRule
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
import { FSHImporter, RawFSH } from '../../src/import';
import { EOL } from 'os';

describe('FSHImporter', () => {
  beforeEach(() => loggerSpy.reset());

  describe('SD Rules', () => {
    // These rules are shared across all StructureDefinition entities:
    //   Profile, Extension, Resource, Logical
    // The intent is that the comprehensive testing of these common rules occurs here
    // while in each StructureDefinition entity test suite, these rules will have simple
    // smoke tests.
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

      it('should parse card rule with only min', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertCardRule(profile.rules[0], 'category', 1, ''); // Unspecified max
      });

      it('should parse card rule with only max', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category ..5
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertCardRule(profile.rules[0], 'category', NaN, '5'); // Unspecified min
      });

      it('should log an error if neither side is specified', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category ..
        `;

        const result = importSingleText(input, 'BadCard.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1); // Rule is still set and element's current cardinalities will be used at export
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Neither side of the cardinality was specified on path \"category\". A min, max, or both need to be specified.\D*/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: BadCard\.fsh.*Line: 4\D*/s);
      });

      it('should parse card rules w/ flags', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS
        * value[x] 1..1 ?!
        * component 2..* SU
        * interpretation 1..* TU
        * note 0..11 N
        * bodySite 1..1 D
        `;

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

      it('should parse single-path multi-value flag rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category MS ?! N
        * value[x] ?! SU D
        * component MS SU ?! TU
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category and value[x] and component MS
        * subject and focus ?!
        * interpretation and note N
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category and value[x] and component MS SU N
        * subject and focus ?! SU TU
        `;

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

      it('should log a warning when paths are listed with commas', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category, value[x] , component MS SU N
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
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
        expect(loggerSpy.getLastMessage('warn')).toMatch(/Using "," to list paths is deprecated/s);
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

      it('should parse value set rules w/ urls and strengths', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category from http://example.org/fhir/ValueSet/CategoryValueSet (required)
        * code from http://example.org/fhir/ValueSet/CodeValueSet (extensible)
        * valueCodeableConcept from http://example.org/fhir/ValueSet/ValueValueSet (preferred)
        * component.code from http://example.org/fhir/ValueSet/ComponentCodeValueSet (example)
        `;

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
        const input = `
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
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category from 123 (required)
        * code from 456 (extensible)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertBindingRule(profile.rules[0], 'category', '123', 'required');
        assertBindingRule(profile.rules[1], 'code', '456', 'extensible');
      });

      it('should parse value set rules w/ no strength and default to required', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet
        * code from http://example.org/fhir/ValueSet/CodeValueSet
        `;

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

      it('should ignore the units keyword and log a warning when parsing value set rules on Quantity', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity units from http://unitsofmeasure.org
        `;

        const result = importSingleText(input, 'UselessQuant.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertBindingRule(
          profile.rules[0],
          'valueQuantity',
          'http://unitsofmeasure.org',
          'required'
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /The "units" keyword is deprecated and has no effect.*File: UselessQuant\.fsh.*Line: 4\D*/s
        );
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

      it('should parse assigned value number (decimal) rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueDecimal = 1.23
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueDecimal', 1.23);
      });

      it('should parse assigned value number (integer) rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueInteger = 123
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueInteger', BigInt(123));
      });

      it('should parse assigned value string rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueString = "hello world"
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueString', 'hello world');
      });

      it('should parse assigned value multi-line string rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueString = """
            hello
            world
            """
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'valueString', 'hello\nworld');
      });

      it('should parse assigned value date rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueDateTime = 2019-11-01T12:30:01.999Z
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertAssignmentRule(profile.rules[0], 'valueDateTime', '2019-11-01T12:30:01.999Z');
      });

      it('should parse assigned value time rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueTime = 12:30:01.999-05:00
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertAssignmentRule(profile.rules[0], 'valueTime', '12:30:01.999-05:00');
      });

      it('should parse assigned value code rule', () => {
        const input = `
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * status = #final
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode('final').withLocation([6, 20, 6, 25]).withFile('');
        assertAssignmentRule(profile.rules[0], 'status', expectedCode);
      });

      it('should parse assigned value CodeableConcept rule', () => {
        const input = `
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * valueCodeableConcept = LOINC#718-7 "Hemoglobin [Mass/volume] in Blood"
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode(
          '718-7',
          'http://loinc.org',
          'Hemoglobin [Mass/volume] in Blood'
        )
          .withLocation([6, 34, 6, 80])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueCodeableConcept', expectedCode);
      });

      it('should parse assigned value CodeableConcept rule with (exactly) modifier', () => {
        const input = `
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * valueCodeableConcept = LOINC#718-7 "Hemoglobin [Mass/volume] in Blood" (exactly)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode(
          '718-7',
          'http://loinc.org',
          'Hemoglobin [Mass/volume] in Blood'
        )
          .withLocation([6, 34, 6, 80])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueCodeableConcept', expectedCode, true);
      });

      it('should ignore the units keyword and log a warning when parsing an assigned value FSHCode rule with units on Quantity', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity units = http://unitsofmeasure.org#cGy
        `;

        const result = importSingleText(input, 'UselessUnits.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode('cGy', 'http://unitsofmeasure.org')
          .withLocation([4, 33, 4, 61])
          .withFile('UselessUnits.fsh');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedCode);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /The "units" keyword is deprecated and has no effect.*File: UselessUnits\.fsh.*Line: 4\D*/s
        );
      });

      it('should parse assigned value Quantity rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = 1.5 'mm'
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedQuantity = new FshQuantity(
          1.5,
          new FshCode('mm', 'http://unitsofmeasure.org').withLocation([5, 31, 5, 34]).withFile('')
        )
          .withLocation([5, 27, 5, 34])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedQuantity);
      });

      it('should parse assigned value Quantity rule with unit display', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = 155.0 '[lb_av]' "lb"
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedQuantity = new FshQuantity(
          155.0,
          new FshCode('[lb_av]', 'http://unitsofmeasure.org', 'lb')
            .withLocation([5, 33, 5, 41])
            .withFile('')
        )
          .withLocation([5, 27, 5, 46])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueQuantity', expectedQuantity);
      });

      it('should parse assigned value Ratio rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1 'dL'
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(
            130,
            new FshCode('mg', 'http://unitsofmeasure.org').withLocation([5, 28, 5, 31]).withFile('')
          )
            .withLocation([5, 24, 5, 31])
            .withFile(''),
          new FshQuantity(
            1,
            new FshCode('dL', 'http://unitsofmeasure.org').withLocation([5, 37, 5, 40]).withFile('')
          )
            .withLocation([5, 35, 5, 40])
            .withFile('')
        )
          .withLocation([5, 24, 5, 40])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric numerator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1 'dL'
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(130).withLocation([5, 24, 5, 26]).withFile(''),
          new FshQuantity(
            1,
            new FshCode('dL', 'http://unitsofmeasure.org').withLocation([5, 32, 5, 35]).withFile('')
          )
            .withLocation([5, 30, 5, 35])
            .withFile('')
        )
          .withLocation([5, 24, 5, 35])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric denominator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(
            130,
            new FshCode('mg', 'http://unitsofmeasure.org').withLocation([5, 28, 5, 31]).withFile('')
          )
            .withLocation([5, 24, 5, 31])
            .withFile(''),
          new FshQuantity(1).withLocation([5, 35, 5, 35]).withFile('')
        )
          .withLocation([5, 24, 5, 35])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Ratio rule w/ numeric numerator and denominator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(130).withLocation([5, 24, 5, 26]).withFile(''),
          new FshQuantity(1).withLocation([5, 30, 5, 30]).withFile('')
        )
          .withLocation([5, 24, 5, 30])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse assigned value Reference rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(fooProfile)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile')
          .withLocation([5, 21, 5, 41])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rules while allowing and translating aliases', () => {
        const input = `
        Alias: FOO = http://hl7.org/fhir/StructureDefinition/Foo

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(FOO) "bar"
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference(
          'http://hl7.org/fhir/StructureDefinition/Foo',
          'bar'
        )
          .withLocation([6, 21, 6, 40])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rule with a display string', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(fooProfile) "bar"
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile', 'bar')
          .withLocation([5, 21, 5, 47])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should parse assigned value Reference rule with whitespace', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(   fooProfile   )
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('fooProfile')
          .withLocation([5, 21, 5, 47])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
      });

      it('should log an error when an assigned value Reference rule has a choice of references', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * basedOn = Reference(cakeProfile or pieProfile)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedReference = new FshReference('cakeProfile')
          .withLocation([5, 21, 5, 56])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'basedOn', expectedReference);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Multiple choices of references are not allowed when setting a value.*Line: 5\D*/s
        );
      });

      it('should parse assigned value using Canonical', () => {
        const input = `
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(Example)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 32, 8, 49])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with spaces around entity name', () => {
        const input = `
        CodeSystem: SpaceyExample
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(   SpaceyExample )
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('SpaceyExample') // No spaces are included in the entityName
          .withLocation([8, 32, 8, 59])
          .withFile('');
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with a version', () => {
        const input = `
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(Example|1.2.3)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 32, 8, 55])
          .withFile('');
        expectedCanonical.version = '1.2.3';
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with spaces around the version', () => {
        const input = `
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(  Example | 1.2.3  )
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 32, 8, 61])
          .withFile('');
        expectedCanonical.version = '1.2.3';
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned value using Canonical with a version which contains a |', () => {
        const input = `
        CodeSystem: Example
        * #first
        * #second

        Profile: ObservationProfile
        Parent: Observation
        * code.coding.system = Canonical(  Example | 1.2.3|aWeirdVersion  )
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);

        const expectedCanonical = new FshCanonical('Example')
          .withLocation([8, 32, 8, 75])
          .withFile('');
        expectedCanonical.version = '1.2.3|aWeirdVersion';
        assertAssignmentRule(profile.rules[0], 'code.coding.system', expectedCanonical);
      });

      it('should parse assigned values that are an alias', () => {
        const input = `
        Alias: EXAMPLE = http://example.org

        Profile: PatientProfile
        Parent: Patient
        * identifier.system = EXAMPLE
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('PatientProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'identifier.system', 'http://example.org');
      });

      it('should parse an assigned value Resource rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * contained[0] = SomeInstance
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertAssignmentRule(profile.rules[0], 'contained[0]', 'SomeInstance', false, true);
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

      it('should parse an only rule with multiple types', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only Quantity or CodeableConcept or string
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only 123
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'value[x]', { type: '123' });
      });

      it('should parse an only rule with multiple numeric type names', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only 123 or 456 or 789
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Practitioner)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'performer', { type: 'Practitioner', isReference: true });
      });

      it('should parse an only rule with a reference to multiple types', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Organization or CareTeam)
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(   Organization    or  CareTeam)
        `;

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

      it('should allow and translate aliases for only types', () => {
        const input = `
        Alias: QUANTITY = http://hl7.org/fhir/StructureDefinition/Quantity
        Alias: CODING = http://hl7.org/fhir/StructureDefinition/Coding

        Profile: ObservationProfile
        Parent: Observation
        * value[x] only CodeableConcept or CODING or string or QUANTITY
        `;

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

      it('should log a warning when references are listed with pipes', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Organization | CareTeam)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'performer',
          { type: 'Organization', isReference: true },
          { type: 'CareTeam', isReference: true }
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Using "\|" to list references is deprecated\..*Line: 4\D*/s
        );
      });

      it('should log a warning when references are listed with pipes with whitespace', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(   Organization  |   CareTeam)
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(
          profile.rules[0],
          'performer',
          { type: 'Organization', isReference: true },
          { type: 'CareTeam', isReference: true }
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Using "\|" to list references is deprecated\..*Line: 4\D*/s
        );
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

      it('should parse contains rule with one item declaring an FSH extension type', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains ComponentExtension named compext 0..1

        Extension: ComponentExtension
        Id: component-extension
        * value[x] only CodeableConcept
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 and DiastolicBP 2..*
        `;

        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP', 'DiastolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
        assertCardRule(profile.rules[2], 'component[DiastolicBP]', 2, '*');
      });

      it('should parse contains rule with mutliple items, some declaring types', () => {
        const input = `
        Alias: FocusCodeExtension = http://hl7.org/fhir/StructureDefinition/observation-focusCode
        Alias: PreconditionExtension = http://hl7.org/fhir/StructureDefinition/observation-precondition
        Profile: ObservationProfile
        Parent: Observation
        * extension contains
            foo 0..1 and
            FocusCodeExtension named focus 1..1 and
            bar 0..* and
            PreconditionExtension named pc 1..*
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 MS D and DiastolicBP 2..* MS SU
        `;

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
        const input = `
        Alias: OffsetExtension = http://hl7.org/fhir/StructureDefinition/observation-timeOffset
        Profile: ObservationProfile
        Parent: Observation
        * component.extension contains OffsetExtension named offset 0..1 MS TU
        `;

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * ^description = "foo"
        * ^experimental = false
        * ^keyword[0] = foo#bar "baz"
        `;
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '', 'description', 'foo', false);
        assertCaretValueRule(profile.rules[1], '', 'experimental', false, false);
        assertCaretValueRule(
          profile.rules[2],
          '',
          'keyword[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 25, 6, 37]).withFile(''),
          false
        );
      });

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

      it('should not include non-breaking spaces as part of the caret path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * status ^short\u00A0= "Non-breaking"
        `;
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], 'status', 'short', 'Non-breaking', false);
      });

      it('should add resources to the contained array using a CaretValueRule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * ^contained = myResource
        `;
        const result = importSingleText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '', 'contained', 'myResource', true);
      });
    });

    describe('#obeysRule', () => {
      it('should parse an obeys rule with one invariant and no path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * obeys SomeInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], '', 'SomeInvariant');
      });

      it('should parse an obeys rule with one invariant and a path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category obeys SomeInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], 'category', 'SomeInvariant');
      });

      it('should parse an obeys rule with multiple invariants and no path', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * obeys SomeInvariant and ThisInvariant and ThatInvariant
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertObeysRule(profile.rules[0], '', 'SomeInvariant');
        assertObeysRule(profile.rules[1], '', 'ThisInvariant');
        assertObeysRule(profile.rules[2], '', 'ThatInvariant');
      });

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

      it('should parse an obeys rule with a numeric invariant name', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * obeys 123
        `;
        const result = importSingleText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertObeysRule(profile.rules[0], '', '123');
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
        const warningRuleSet = new ParamRuleSet('WarningRuleSet')
          .withFile('RuleSet.fsh')
          .withLocation([30, 12, 32, 53]);
        warningRuleSet.parameters = ['value'];
        warningRuleSet.contents = [
          '* focus[0] only Reference(Patient | {value})',
          '* focus[1] only Reference(Group | {value})'
        ].join(EOL);
        importer.paramRuleSets.set(warningRuleSet.name, warningRuleSet);
      });

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

      it('should parse an insert rule with a RuleSet with one parameter', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final)
        `;
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'OneParamRuleSet', ['#final']);
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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#preliminary, "this is a string value\\, right?", 4)
        `;
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'MultiParamRuleSet', [
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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final "(Final\\)")
        `;
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'OneParamRuleSet', ['#final "(Final)"']);
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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#final, "very\\nstrange\\rvalue\\\\\\tindeed", 1)
        `;
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'MultiParamRuleSet', [
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

      it('should parse an insert rule that separates its parameters onto multiple lines', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (
          #final,
          "string value",
          7
        )
        `;
        const allDocs = importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
        expect(allDocs).toHaveLength(1);
        const doc = allDocs[0];
        const profile = doc.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertInsertRule(profile.rules[0], 'MultiParamRuleSet', ['#final', '"string value"', '7']);
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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MultiParamRuleSet (#preliminary, "something", 3)
        * insert MultiParamRuleSet (#preliminary, "something", 3)
        `;
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
        assertInsertRule(profile.rules[0], 'MultiParamRuleSet', [
          '#preliminary',
          '"something"',
          '3'
        ]);
        assertInsertRule(profile.rules[1], 'MultiParamRuleSet', [
          '#preliminary',
          '"something"',
          '3'
        ]);
      });

      it('should parse an insert rule with parameters that will use the same RuleSet more than once with different parameters each time', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert EntryRules (Recursive)
        `;
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
        assertInsertRule(firstEntryRules.rules[0], 'RecursiveRules', ['5']);

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
        assertInsertRule(recursiveRules.rules[1], 'EntryRules', ['BaseCase']);

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
        assertInsertRule(secondEntryRules.rules[0], 'BaseCaseRules', ['5']);

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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert OneParamRuleSet (#final, "Final")
        `;
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
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * insert MysteriousRuleSet ("mystery")
        `;
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
        const input = `
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(path with spaces, 1, *)
        `;
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Error parsing insert rule with parameterized RuleSet CardRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log one error when nested insert rules with parameters result in multiple parser errors in the generated RuleSets', () => {
        const input = `
        Profile: MyObservation
        Parent: Observation
        * note 0..1
        * insert FirstRiskyRuleSet("Observation.id")
        `;
        importer.import([new RawFSH(input, 'Insert.fsh')]);
        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Errors parsing insert rule with parameterized RuleSet FirstRiskyRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 5/s);
      });

      it('should not log an error when an insert rule with parameters results in rules that are syntactically correct but semantically invalid', () => {
        const input = `
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(nonExistentPath, 7, 4)
        `;
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

      it('should log one warning when an insert rule with parameters results in warnings', () => {
        const input = `
        Profile: MyObservation
        Parent: Observation
        * insert WarningRuleSet(Device)
        `;
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numWarn).toBe(1);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /Warnings parsing insert rule with parameterized RuleSet WarningRuleSet/s
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });

      it('should log one error when an insert rule with parameters results in non-parser errors', () => {
        const input = `
        Profile: MyObservation
        Parent: Observation
        * insert CardRuleSet(nonExistentPath, , )
        `;
        importer.import([new RawFSH(input, 'Insert.fsh')]);

        expect(stats.numError).toBe(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Errors parsing insert rule with parameterized RuleSet CardRuleSet/s
        );
        expect(loggerSpy.getLastMessage('error')).toMatch(/File: Insert\.fsh.*Line: 4/s);
      });
    });
  });

  describe('LR Rules', () => {
    // These rules are shared across these StructureDefinition entities:
    //   Resource, Logical
    describe('#addElementRule', () => {
      it('should parse basic addElement rules with defaulted definition', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean "short boolean" 
        * stuff 0..* string "short string"
        * address 1..* Address "short Address"
        * person 0..1 Reference(Patient) "short Reference"
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }],
          defs: { short: 'short boolean', definition: 'short boolean' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'short string', definition: 'short string' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }],
          defs: { short: 'short Address', definition: 'short Address' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          types: [{ type: 'Patient', isReference: true }],
          defs: { short: 'short Reference', definition: 'short Reference' }
        });
      });

      it('should parse basic addElement rules with specified definition', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean "short boolean" "definition boolean" 
        * stuff 0..* string "short string" "definition string"
        * address 1..* Address "short Address" "definition Address"
        * person 0..1 Reference(Patient) "short Reference" "definition Reference"
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }],
          defs: { short: 'short boolean', definition: 'definition boolean' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'short string', definition: 'definition string' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }],
          defs: { short: 'short Address', definition: 'definition Address' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          types: [{ type: 'Patient', isReference: true }],
          defs: { short: 'short Reference', definition: 'definition Reference' }
        });
      });

      it('should parse addElement rules with multiple targetTypes', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean or number "short boolean"
        * stuff 0..* string or markdown "short string"
        * address 1..* Address "short Address"
        * person 0..1 HumanName or Reference(Patient or RelatedPerson) "short multi-type"
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }, { type: 'number' }],
          defs: { short: 'short boolean', definition: 'short boolean' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }, { type: 'markdown' }],
          defs: { short: 'short string', definition: 'short string' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          types: [{ type: 'Address' }],
          defs: { short: 'short Address', definition: 'short Address' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          types: [
            { type: 'HumanName', isReference: false },
            { type: 'Patient', isReference: true },
            { type: 'RelatedPerson', isReference: true }
          ],
          defs: { short: 'short multi-type', definition: 'short multi-type' }
        });
      });

      it('should parse addElement rules with flags', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS ?! boolean "short boolean" 
        * stuff 0..* MS SU string "short string"
        * address 1..* N Address "short Address"
        * person 0..1 D TU Reference(Patient) "short Reference"
        `;

        const result = importSingleText(input);
        const resource = result.resources.get('TestResource');
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true, modifier: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'short boolean', definition: 'short boolean' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          flags: { mustSupport: true, summary: true },
          types: [{ type: 'string' }],
          defs: { short: 'short string', definition: 'short string' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          flags: { normative: true },
          types: [{ type: 'Address' }],
          defs: { short: 'short Address', definition: 'short Address' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          flags: { draft: true, trialUse: true },
          types: [{ type: 'Patient', isReference: true }],
          defs: { short: 'short Reference', definition: 'short Reference' }
        });
      });

      it('should parse addElement rules with docs', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* N Address "current addresses" "at least one address is required"
        * person 0..1 D TU Reference(Patient) "an associated patient" "added for TRIAL USE"
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
          flags: { normative: true },
          types: [{ type: 'Address' }],
          defs: { short: 'current addresses', definition: 'at least one address is required' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          flags: { trialUse: true, draft: true },
          types: [{ type: 'Patient', isReference: true }],
          defs: { short: 'an associated patient', definition: 'added for TRIAL USE' }
        });
      });

      it('should log an error for missing path', () => {
        const input = `
        Resource: TestResource
        * 1..1 boolean "short boolean" 
        * stuff 0..* string "short string"
        * address 1..* Address "short Address"
        * person 0..1 Reference(Patient) "short Reference"
       `;

        const result = importSingleText(input, 'BadPath.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /no viable alternative at input.*File: BadPath\.fsh.*Line: 3\D*/s
        );
        // Error results in excluding the rule with the error, hence length of 3 rather than 4
        expect(resource.rules).toHaveLength(3);
      });

      it('should log an error for missing cardinality', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean "short boolean"
        * stuff string "short string"
        * address 1..* Address "short Address"
        * person 0..1 Reference(Patient) "short Reference"
       `;

        const result = importSingleText(input, 'BadCard.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /no viable alternative at input.*File: BadCard\.fsh.*Line: 4\D*/s
        );
        // Error results in excluding the rule with the error, hence length of 3 rather than 4
        expect(resource.rules).toHaveLength(3);
      });

      it('should log an error when min cardinality is not specified', () => {
        const input = `
        Logical: LogicalModel
        * isInValid ..* string "short string"
        `;

        const result = importSingleText(input, 'Invalid.fsh');
        const logical = result.logicals.get('LogicalModel');

        expect(logical.rules).toHaveLength(1);
        assertAddElementRule(logical.rules[0], 'isInValid', {
          card: { min: NaN, max: '*' },
          types: [{ type: 'string' }],
          defs: { short: 'short string', definition: 'short string' }
        });
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'min' cardinality attribute in AddElementRule/s
        );
      });

      it('should log an error when max cardinality is not specified', () => {
        const input = `
        Logical: LogicalModel
        * isInValid 0.. string "short string"
        `;

        const result = importSingleText(input, 'Invalid.fsh');
        const logical = result.logicals.get('LogicalModel');

        expect(logical.rules).toHaveLength(1);
        assertAddElementRule(logical.rules[0], 'isInValid', {
          card: { min: 0, max: '' },
          types: [{ type: 'string' }],
          defs: { short: 'short string', definition: 'short string' }
        });
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'max' cardinality attribute in AddElementRule/s
        );
      });

      it('should log an error for extra docs/strings', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS boolean "is it valid?"
        * stuff 0..* string "just stuff" "a list of some stuff" "invalid additional string"
        * address 1..* N Address "current addresses" "at least one address is required"
        * person 0..1 D TU Reference(Patient) "an associated patient" "added for TRIAL USE"
        `;

        const result = importSingleText(input, 'BadDocs.fsh)');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /extraneous input.*File: BadDocs\.fsh.*Line: 4\D*/s
        );
        // Error results in excluding the following rules, hence length of 2 rather than 4
        expect(resource.rules).toHaveLength(2);
      });

      it('should log an error for missing short', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean 
        * stuff 0..* string "short string"
        * address 1..* Address "short Address"
        * person 0..1 Reference(Patient) "short Reference"
       `;

        const result = importSingleText(input, 'BadDefs.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /The 'short' attribute in AddElementRule for path 'isValid' must be specified.*File: BadDefs\.fsh.*Line: 3\D*/s
        );
        // Error results in element not having defs defined
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }]
        });
      });

      it('should log an error for missing targetType with docs', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean "is it valid?" 
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* "current addresses" "at least one address is required"
        * person 0..1 Reference(Patient) "an associated patient" "added for TRIAL USE"
       `;

        const result = importSingleText(input, 'BadType.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /extraneous input.*File: BadType\.fsh.*Line: 5\D*/s
        );
        // Error results in excluding the following rules, hence length of 3 rather than 5
        expect(resource.rules).toHaveLength(3);
      });

      it('should log a warning for missing targetType with flags and docs', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS ?! boolean "is it valid?" 
        * stuff 0..* MS SU string "just stuff" "a list of some stuff"
        * address 1..* N TU "current addresses" "at least one address is required"
        * person 0..1 D TU Reference(Patient) "an associated patient" "added for TRIAL USE"
       `;

        const result = importSingleText(input, 'BadType.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /appears to be a flag value.*File: BadType\.fsh.*Line: 5\D*/s
        );
        expect(resource.rules).toHaveLength(4);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          flags: { mustSupport: true, modifier: true },
          types: [{ type: 'boolean' }],
          defs: { short: 'is it valid?' }
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          flags: { mustSupport: true, summary: true },
          types: [{ type: 'string' }],
          defs: { short: 'just stuff', definition: 'a list of some stuff' }
        });
        assertAddElementRule(resource.rules[2], 'address', {
          card: { min: 1, max: '*' },
          flags: { normative: true },
          types: [{ type: 'TU' }],
          defs: { short: 'current addresses', definition: 'at least one address is required' }
        });
        assertAddElementRule(resource.rules[3], 'person', {
          card: { min: 0, max: '1' },
          flags: { trialUse: true, draft: true },
          types: [{ type: 'Patient', isReference: true }],
          defs: { short: 'an associated patient', definition: 'added for TRIAL USE' }
        });
      });

      it('should log a error for missing targetType with modifier flag and docs', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 MS ?! boolean "is it valid?" 
        * stuff 0..* MS SU string "just stuff" "a list of some stuff"
        * address 1..* N ?! "current addresses" "at least one address is required"
        * person 0..1 D TU Reference(Patient) "an associated patient" "added for TRIAL USE"
       `;

        const result = importSingleText(input, 'BadType.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /extraneous input.*File: BadType\.fsh.*Line: 5\D*/s
        );
        // The 'address' rule results in a CardRule and a FlagRule rather tha an AddElementRule.
        // Due to the error, the 'person' rule is not processed.
        expect(resource.rules).toHaveLength(4);
      });

      it('should parse rules according to rule patterns for CardRule and AddElementRule', () => {
        const input = `
        Resource: TestResource
        * isValid 1..1 boolean "is it valid?" 
        * stuff 0..* string "just stuff" "a list of some stuff"
        * address 1..* "current addresses" "at least one address is required"
        * person 0..1 Reference(Patient) "an associated patient"
       `;

        const result = importSingleText(input, 'BadType.fsh');
        const resource = result.resources.get('TestResource');
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /extraneous input.*File: BadType\.fsh.*Line: 5\D*/s
        );

        expect(resource.rules).toHaveLength(3);
        assertAddElementRule(resource.rules[0], 'isValid', {
          card: { min: 1, max: '1' },
          types: [{ type: 'boolean' }]
        });
        assertAddElementRule(resource.rules[1], 'stuff', {
          card: { min: 0, max: '*' },
          types: [{ type: 'string' }]
        });
        // There is no way to distinguish between a valid CardRule
        // and an invalid AddElementRule with a missing targetType,
        // so the CardRule wins.
        assertCardRule(resource.rules[2], 'address', 1, '*');
        // Due to the error, the 'person' rule is not processed.
      });
    });
  });
});
