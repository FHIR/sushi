import {
  assertCardRule,
  assertFixedValueRule,
  assertFlagRule,
  assertOnlyRule,
  assertValueSetRule,
  assertContainsRule,
  assertCaretValueRule
} from '../utils/asserts';
import { importText } from '../../src/import';
import { FshCode, FshQuantity, FshRatio } from '../../src/fshtypes';
import { logger } from '../../src/utils/FSHLogger';

describe('FSHImporter', () => {
  let mockWriter: jest.SpyInstance<boolean, [any, string, ((error: Error) => void)?]>;

  beforeAll(() => {
    mockWriter = jest.spyOn(logger.transports[0], 'write');
  });

  describe('Profile', () => {
    describe('#sdMetadata', () => {
      it('should parse the simplest possible profile', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        `;

        const result = importText(input, 'Simple.fsh');
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

      it('should parse profile with additional metadata properties', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        Id: observation-profile
        Title: "An Observation Profile"
        Description: "A profile on Observation"
        `;

        const result = importText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.parent).toBe('Observation');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
        expect(profile.sourceInfo.location).toEqual({
          startLine: 2,
          startColumn: 9,
          endLine: 6,
          endColumn: 47
        });
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

        const result = importText(input);
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

        const result = importText(input);
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
        Parent: DuplicateObservation
        Id: duplicate-observation-profile
        Title: "Duplicate Observation Profile"
        Description: "A duplicated profile on Observation"
        `;

        const result = importText(input);
        expect(result.profiles.size).toBe(1);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.name).toBe('ObservationProfile');
        expect(profile.id).toBe('observation-profile');
        expect(profile.title).toBe('An Observation Profile');
        expect(profile.description).toBe('A profile on Observation');
      });
    });

    describe('#cardRule', () => {
      it('should parse simple card rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5
        * value[x] 1..1
        * component 2..*
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertCardRule(profile.rules[1], 'value[x]', 1, 1);
        assertCardRule(profile.rules[2], 'component', 2, '*');
      });

      it('should parse card rules w/ flags', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS
        * value[x] 1..1 ?!
        * component 2..* SU
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(6);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertFlagRule(profile.rules[1], 'category', true, undefined, undefined);
        assertCardRule(profile.rules[2], 'value[x]', 1, 1);
        assertFlagRule(profile.rules[3], 'value[x]', undefined, undefined, true);
        assertCardRule(profile.rules[4], 'component', 2, '*');
        assertFlagRule(profile.rules[5], 'component', undefined, true, undefined);
      });

      it('should parse card rules w/ multiple flags', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category 1..5 MS ?!
        * value[x] 1..1 ?! SU
        * component 2..* SU MS
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(6);
        assertCardRule(profile.rules[0], 'category', 1, 5);
        assertFlagRule(profile.rules[1], 'category', true, undefined, true);
        assertCardRule(profile.rules[2], 'value[x]', 1, 1);
        assertFlagRule(profile.rules[3], 'value[x]', undefined, true, true);
        assertCardRule(profile.rules[4], 'component', 2, '*');
        assertFlagRule(profile.rules[5], 'component', true, true, undefined);
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
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertFlagRule(profile.rules[0], 'category', true, undefined, undefined);
        assertFlagRule(profile.rules[1], 'value[x]', undefined, undefined, true);
        assertFlagRule(profile.rules[2], 'component', undefined, true, undefined);
      });

      it('should parse single-path multi-value flag rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category MS ?!
        * value[x] ?! SU
        * component MS SU ?!
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertFlagRule(profile.rules[0], 'category', true, undefined, true);
        assertFlagRule(profile.rules[1], 'value[x]', undefined, true, true);
        assertFlagRule(profile.rules[2], 'component', true, true, true);
      });

      it('should parse multi-path single-value flag rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category, value[x], component MS
        * subject, focus ?!
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertFlagRule(profile.rules[0], 'category', true, undefined, undefined);
        assertFlagRule(profile.rules[1], 'value[x]', true, undefined, undefined);
        assertFlagRule(profile.rules[2], 'component', true, undefined, undefined);
        assertFlagRule(profile.rules[3], 'subject', undefined, undefined, true);
        assertFlagRule(profile.rules[4], 'focus', undefined, undefined, true);
      });

      it('should parse multi-path multi-value flag rules', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category, value[x], component MS SU
        * subject, focus ?! SU
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertFlagRule(profile.rules[0], 'category', true, true, undefined);
        assertFlagRule(profile.rules[1], 'value[x]', true, true, undefined);
        assertFlagRule(profile.rules[2], 'component', true, true, undefined);
        assertFlagRule(profile.rules[3], 'subject', undefined, true, true);
        assertFlagRule(profile.rules[4], 'focus', undefined, true, true);
      });
    });

    describe('#valueSetRule', () => {
      it('should parse value set rules w/ names and strengths', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet (required)
        * code from CodeValueSet (extensible)
        * valueCodeableConcept from ValueValueSet (preferred)
        * component.code from ComponentCodeValueSet (example)
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertValueSetRule(profile.rules[0], 'category', 'CategoryValueSet', 'required');
        assertValueSetRule(profile.rules[1], 'code', 'CodeValueSet', 'extensible');
        assertValueSetRule(profile.rules[2], 'valueCodeableConcept', 'ValueValueSet', 'preferred');
        assertValueSetRule(profile.rules[3], 'component.code', 'ComponentCodeValueSet', 'example');
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

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertValueSetRule(
          profile.rules[0],
          'category',
          'http://example.org/fhir/ValueSet/CategoryValueSet',
          'required'
        );
        assertValueSetRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'extensible'
        );
        assertValueSetRule(
          profile.rules[2],
          'valueCodeableConcept',
          'http://example.org/fhir/ValueSet/ValueValueSet',
          'preferred'
        );
        assertValueSetRule(
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

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(4);
        assertValueSetRule(
          profile.rules[0],
          'category',
          'http://example.org/fhir/ValueSet/CategoryValueSet',
          'required'
        );
        assertValueSetRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'extensible'
        );
        assertValueSetRule(
          profile.rules[2],
          'valueCodeableConcept',
          'http://example.org/fhir/ValueSet/ValueValueSet',
          'preferred'
        );
        assertValueSetRule(
          profile.rules[3],
          'component.code',
          'http://example.org/fhir/ValueSet/ComponentCodeValueSet',
          'example'
        );
      });

      it('should parse value set rules w/ no strength and default to required', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category from CategoryValueSet
        * code from http://example.org/fhir/ValueSet/CodeValueSet
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertValueSetRule(profile.rules[0], 'category', 'CategoryValueSet', 'required');
        assertValueSetRule(
          profile.rules[1],
          'code',
          'http://example.org/fhir/ValueSet/CodeValueSet',
          'required'
        );
      });
    });

    describe('#fixedValueRule', () => {
      it('should parse fixed value boolean rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueBoolean = true
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertFixedValueRule(profile.rules[0], 'valueBoolean', true);
      });

      it('should parse fixed value number rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueDecimal = 1.23
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertFixedValueRule(profile.rules[0], 'valueDecimal', 1.23);
      });

      it('should parse fixed value string rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueString = "hello world"
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertFixedValueRule(profile.rules[0], 'valueString', 'hello world');
      });

      it('should parse fixed value multi-line string rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueString = """
            hello
            world
            """
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertFixedValueRule(profile.rules[0], 'valueString', 'hello\nworld');
      });

      it('should parse fixed value date rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueDateTime = 2019-11-01T12:30:01.999Z
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertFixedValueRule(profile.rules[0], 'valueDateTime', '2019-11-01T12:30:01.999Z');
      });

      it('should parse fixed value time rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * valueTime = 12:30:01.999-05:00
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        // For now, treating dates like strings
        assertFixedValueRule(profile.rules[0], 'valueTime', '12:30:01.999-05:00');
      });

      it('should parse fixed value code rule', () => {
        const input = `
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * status = #final
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode('final').withLocation([6, 20, 6, 25]).withFile('');
        assertFixedValueRule(profile.rules[0], 'status', expectedCode);
      });

      it('should parse fixed value CodeableConcept rule', () => {
        const input = `
        Alias: LOINC = http://loinc.org

        Profile: ObservationProfile
        Parent: Observation
        * valueCodeableConcept = LOINC#718-7 "Hemoglobin [Mass/volume] in Blood"
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedCode = new FshCode(
          '718-7',
          'http://loinc.org',
          'Hemoglobin [Mass/volume] in Blood'
        )
          .withLocation([6, 34, 6, 80])
          .withFile('');
        assertFixedValueRule(profile.rules[0], 'valueCodeableConcept', expectedCode);
      });

      it('should parse fixed value Quantity rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueQuantity = 1.5 'mm'
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedQuantity = new FshQuantity(
          1.5,
          new FshCode('mm', 'http://unitsofmeasure.org').withLocation([5, 31, 5, 34]).withFile('')
        )
          .withLocation([5, 27, 5, 34])
          .withFile('');
        assertFixedValueRule(profile.rules[0], 'valueQuantity', expectedQuantity);
      });

      it('should parse fixed value Ratio rule', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1 'dL'
        `;

        const result = importText(input);
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
        assertFixedValueRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse fixed value Ratio rule w/ numeric numerator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1 'dL'
        `;

        const result = importText(input);
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
        assertFixedValueRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse fixed value Ratio rule w/ numeric denominator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 'mg' : 1
        `;

        const result = importText(input);
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
        assertFixedValueRule(profile.rules[0], 'valueRatio', expectedRatio);
      });

      it('should parse fixed value Ratio rule w/ numeric numerator and denominator', () => {
        const input = `

        Profile: ObservationProfile
        Parent: Observation
        * valueRatio = 130 : 1
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        const expectedRatio = new FshRatio(
          new FshQuantity(130).withLocation([5, 24, 5, 26]).withFile(''),
          new FshQuantity(1).withLocation([5, 30, 5, 30]).withFile('')
        )
          .withLocation([5, 24, 5, 30])
          .withFile('');
        assertFixedValueRule(profile.rules[0], 'valueRatio', expectedRatio);
      });
    });

    describe('#onlyRule', () => {
      it('should parse an only rule with one type', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * value[x] only Quantity
        `;

        const result = importText(input);
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

        const result = importText(input);
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

      it('should parse an only rule with a reference to one type', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Practitioner)
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(1);
        assertOnlyRule(profile.rules[0], 'performer', { type: 'Practitioner', isReference: true });
      });

      it('should parse an only rule with a reference to multiple types', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * performer only Reference(Organization | CareTeam)
        `;

        const result = importText(input);
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

        const result = importText(input);
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
    });

    describe('#containsRule', () => {
      it('should parse contains rule with one type', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
      });

      it('should parse contains rule with an alias', () => {
        const input = `
        Alias: FooBar = http://example.com
        Profile: ObservationProfile
        Parent: Observation
        * component contains FooBar 1..1
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(2);
        assertContainsRule(profile.rules[0], 'component', 'http://example.com');
        assertCardRule(profile.rules[1], 'component[http://example.com]', 1, 1);
      });

      it('should parse contains rules with multiple types', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 and DiastolicBP 2..*
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(3);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP', 'DiastolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
        assertCardRule(profile.rules[2], 'component[DiastolicBP]', 2, '*');
      });

      it('should parse contains rules with flags', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * component contains SystolicBP 1..1 MS and DiastolicBP 2..* MS SU
        `;

        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(5);
        assertContainsRule(profile.rules[0], 'component', 'SystolicBP', 'DiastolicBP');
        assertCardRule(profile.rules[1], 'component[SystolicBP]', 1, 1);
        assertFlagRule(profile.rules[2], 'component[SystolicBP]', true, undefined, undefined);
        assertCardRule(profile.rules[3], 'component[DiastolicBP]', 2, '*');
        assertFlagRule(profile.rules[4], 'component[DiastolicBP]', true, true, undefined);
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
        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], '', 'description', 'foo');
        assertCaretValueRule(profile.rules[1], '', 'experimental', false);
        assertCaretValueRule(
          profile.rules[2],
          '',
          'keyword[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 25, 6, 37]).withFile('')
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
        const result = importText(input);
        const profile = result.profiles.get('ObservationProfile');
        assertCaretValueRule(profile.rules[0], 'status', 'short', 'foo');
        assertCaretValueRule(profile.rules[1], 'status', 'sliceIsConstraining', false);
        assertCaretValueRule(
          profile.rules[2],
          'status',
          'code[0]',
          new FshCode('bar', 'foo', 'baz').withLocation([6, 29, 6, 41]).withFile('')
        );
      });
    });

    describe('#obeysRule', () => {
      // the current importer does not support obeys rule.
      // this test should be removed once obeys rules are supported.
      it('should issue a message when parsing an obeys rule', () => {
        const input = `
        Profile: ObservationProfile
        Parent: Observation
        * category obeys SomeInvariant
        `;
        const result = importText(input, 'Obeys.fsh');
        const profile = result.profiles.get('ObservationProfile');
        expect(profile.rules).toHaveLength(0);
        expect(mockWriter.mock.calls[mockWriter.mock.calls.length - 1][0].message).toMatch(
          /File: Obeys\.fsh.*Line 4\D.*Column 9\D.*Line 4\D.*Column 38\D/s
        );
      });
    });
  });
});
