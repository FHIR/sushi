import { importText, RawFSH } from '../../src/import';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode, FshQuantity } from '../../src/fshtypes';
import {
  AddElementRule,
  AssignmentRule,
  BindingRule,
  ConceptRule,
  InsertRule,
  MappingRule,
  ObeysRule,
  OnlyRule,
  ValueSetConceptComponentRule
} from '../../src/fshtypes/rules';
import { assertAssignmentRule, assertFlagRule } from '../testhelpers/asserts';
import { importSingleText } from '../testhelpers/importSingleText';
import { leftAlign } from '../utils/leftAlign';

describe('FSHImporter', () => {
  beforeEach(() => loggerSpy.reset());

  it('should default filename to blank string', () => {
    const input = '';
    const result = importSingleText(input);
    expect(result.file).toBe('');
  });

  it('should retain the passed in file name', () => {
    const input = '';
    const result = importSingleText(input, 'FSHImporter.test.ts');
    expect(result.file).toBe('FSHImporter.test.ts');
  });

  it('should allow a blank FSH document', () => {
    const input = '';
    const result = importSingleText(input);
    expect(result.aliases.size).toBe(0);
    expect(result.profiles.size).toBe(0);
    expect(result.extensions.size).toBe(0);
  });

  it('should recover from extraneous input errors from antlr', () => {
    const input = leftAlign(`
    OOPS!

    Profile: Foo
    Parent: FooDad
    `);
    const result = importSingleText(input, 'Extra.fsh');
    const profile = result.profiles.get('Foo');
    expect(profile.name).toBe('Foo');
    expect(profile.parent).toBe('FooDad');
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Extra\.fsh.*Line: 2\D*/s);
  });

  it('should parse escaped double-quote and backslash characters in strings', () => {
    const input = leftAlign(`
    Profile: Escape
    Parent: Observation
    Title: "Can \\"you\\" escape \\\\ this \\\\ string?"
    * code = #"This \\\\ code \\"is quite\\" challenging \\\\to escape"
    `);
    const result = importSingleText(input, 'Escape.fsh');
    const profile = result.profiles.get('Escape');
    expect(profile.title).toBe('Can "you" escape \\ this \\ string?');
    const expectedCode = new FshCode('This \\ code "is quite" challenging \\to escape')
      .withLocation([5, 10, 5, 61])
      .withFile('Escape.fsh');
    expect(profile.rules).toHaveLength(1);
    assertAssignmentRule(profile.rules[0], 'code', expectedCode);
  });

  it('should parse escaped hash and backslash characters in system identifiers in codings', () => {
    const input = leftAlign(`
    Profile: HashBrowns
    Parent: Observation
    * code = https://breakfast.com/good\\\\food\\#potatoes#hash#browns
    * extraCode = https://lastly.com/backslash\\\\#last
    * bonusCode = \\\\\\\\#just_backslash "Just Backslash"
    `);
    const result = importSingleText(input, 'HashBrowns.fsh');
    const profile = result.profiles.get('HashBrowns');
    const expectedCode = new FshCode('hash#browns', 'https://breakfast.com/good\\food#potatoes')
      .withLocation([4, 10, 4, 63])
      .withFile('HashBrowns.fsh');
    const expectedExtraCode = new FshCode('last', 'https://lastly.com/backslash\\')
      .withLocation([5, 15, 5, 49])
      .withFile('HashBrowns.fsh');
    const expectedBonusCode = new FshCode('just_backslash', '\\\\', 'Just Backslash')
      .withLocation([6, 15, 6, 50])
      .withFile('HashBrowns.fsh');
    expect(profile.rules).toHaveLength(3);
    assertAssignmentRule(profile.rules[0], 'code', expectedCode);
    assertAssignmentRule(profile.rules[1], 'extraCode', expectedExtraCode);
    assertAssignmentRule(profile.rules[2], 'bonusCode', expectedBonusCode);
  });

  it('should parse escaped unicode characters in strings and multiline strings', () => {
    const input = leftAlign(`
    Profile: Escape
    Parent: Observation
    Title: "Just going to \\u270E in some unicode"
    * valueString = "This cool \\u2603 can read music in \\uD834\\uDD1E!"
    * category.text = """
      When there is a sign of \\u2744, often school is canceled.
      Kids can stay home and play with \\uD83C\\uDC31 or do anything!
    """
    `);
    const result = importSingleText(input, 'Escape.fsh');
    const profile = result.profiles.get('Escape');
    const expectedCategoryText = [
      'When there is a sign of \u2744, often school is canceled.',
      'Kids can stay home and play with \uD83C\uDC31 or do anything!'
    ].join('\n');
    expect(profile.title).toEqual('Just going to \u270E in some unicode');
    expect(profile.rules).toHaveLength(2);
    assertAssignmentRule(
      profile.rules[0],
      'valueString',
      'This cool \u2603 can read music in \uD834\uDD1E!'
    );
    assertAssignmentRule(profile.rules[1], 'category.text', expectedCategoryText);
  });

  it('should parse unescaped unicode characters in strings and multiline strings', () => {
    const input = leftAlign(`
    Profile: Escape
    Parent: Observation
    Title: "Just going to ✎ in some unicode"
    * valueString = "This cool ☃ can read music in 𝄞!"
    * category.text = """
      When there is a sign of ❄, often school is canceled.
      Kids can stay home and play with 🀱 or do anything!
    """
    `);
    const result = importSingleText(input, 'Escape.fsh');
    const profile = result.profiles.get('Escape');
    const expectedCategoryText = [
      'When there is a sign of \u2744, often school is canceled.',
      'Kids can stay home and play with \uD83C\uDC31 or do anything!'
    ].join('\n');
    expect(profile.title).toEqual('Just going to \u270E in some unicode');
    expect(profile.rules).toHaveLength(2);
    assertAssignmentRule(
      profile.rules[0],
      'valueString',
      'This cool \u2603 can read music in \uD834\uDD1E!'
    );
    assertAssignmentRule(profile.rules[1], 'category.text', expectedCategoryText);
  });

  it('should parse a code that has an unmatched quote (") at the start of the code', () => {
    const input = `
    Profile: MismatchedQuote
    Parent: Observation
    * code = https://breakfast.com/goodfood#"potatoes
    `;
    const result = importSingleText(input, 'MismatchedQuote.fsh');
    const profile = result.profiles.get('MismatchedQuote');
    const expectedCode = new FshCode('"potatoes', 'https://breakfast.com/goodfood')
      .withLocation([4, 14, 4, 53])
      .withFile('MismatchedQuote.fsh');
    expect(profile.rules).toHaveLength(1);
    assertAssignmentRule(profile.rules[0], 'code', expectedCode);
  });

  it('should parse a rule that uses non-breaking spaces in a concept string', () => {
    const input = leftAlign(`
    Profile: NonBreakingObservation
    Parent: Observation
    * code = #"These\u0020are\u0020non-breaking."
    `);
    const result = importSingleText(input, 'NonBreaking.fsh');
    const profile = result.profiles.get('NonBreakingObservation');
    const expectedCode = new FshCode('These\u0020are\u0020non-breaking.')
      .withLocation([4, 10, 4, 35])
      .withFile('NonBreaking.fsh');
    expect(profile.rules).toHaveLength(1);
    assertAssignmentRule(profile.rules[0], 'code', expectedCode);
  });

  it('should log an error when a concept string starts with whitespace', () => {
    const input = leftAlign(`
    Profile: NonBreakingObservation
    Parent: Observation
    * code = #"\u0020Leading whitespace prohibited."
    `);
    const result = importSingleText(input, 'NonBreaking.fsh');
    result.profiles.get('NonBreakingObservation');
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /extraneous input.*File: NonBreaking\.fsh.*Line: 4\D*/s
    );
  });

  it('should parse a rule on an element named system', () => {
    const input = leftAlign(`
    Profile: MyOperation
    Parent: OperationDefinition
    * system = true
    `);
    const result = importSingleText(input, 'MyOperation.fsh');
    const profile = result.profiles.get('MyOperation');
    expect(profile.rules).toHaveLength(1);
    assertAssignmentRule(profile.rules[0], 'system', true);
  });

  it('should parse rules on a list of paths that includes system', () => {
    const input = leftAlign(`
    Profile: TrialOperationDefinition
    Parent: OperationDefinition
    * system and type TU
    * instance and system and type SU
    * instance and system MS
    `);
    const result = importSingleText(input, 'TrialOperationDefinition.fsh');
    const profile = result.profiles.get('TrialOperationDefinition');
    expect(profile.rules).toHaveLength(7);
    assertFlagRule(
      profile.rules[0],
      'system',
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[1],
      'type',
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[2],
      'instance',
      undefined,
      true,
      undefined,
      undefined,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[3],
      'system',
      undefined,
      true,
      undefined,
      undefined,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[4],
      'type',
      undefined,
      true,
      undefined,
      undefined,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[5],
      'instance',
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    assertFlagRule(
      profile.rules[6],
      'system',
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should parse a rule on an element named exclude', () => {
    const input = leftAlign(`
    Profile: MyGroup
    Parent: Group
    * characteristic
      * exclude MS
    `);
    const result = importSingleText(input, 'MyGroup.fsh');
    const profile = result.profiles.get('MyGroup');
    expect(profile.rules).toHaveLength(1);
    assertFlagRule(
      profile.rules[0],
      'characteristic.exclude',
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('should parse entity names that look like dates or times', () => {
    const input = leftAlign(`

    Alias: 1950-04-01 = http://aprilfools.com

    Profile: 2000-01
    Parent: Observation
    * obeys 2000-10-31T00:01:02.000+00:00

    Profile: 2001
    Parent: 2000-01

    Extension: 2000-10
    * value[x] from 2000-10-31

    ValueSet: 2000-10-31
    * 2000-10-31T00#2001-01
    * 1950-04-01#2001-01-01

    CodeSystem: 2000-10-31T00
    * #2001-01 "Jan 2001" "January 2001"

    Logical: 2000-10-31T00:01
    * 1999-12-31 0..1 dateTime "Party" "Party like it's 1999"

    Resource: 2000-10-31T00:01:02
    Parent: DomainResource
    * contained only 2000

    Instance: 2000-10-31T00:01:02.000
    InstanceOf: Observation
    * insert 12:30
    * code = #123

    Instance: 1800-02-28
    InstanceOf: 2000-10-31T00:01
    * 1999-12-31 = 2000-01-01

    Invariant: 2000-10-31T00:01:02.000+00:00
    Description: "It shall not defy the laws of physics nor the laws of men"
    Severity: #error

    Mapping: 12
    Source: 2000-10-31T00:01
    Target: "http://unknown.org/mystery"
    * 1999-12-31 -> "Patient"

    RuleSet: 12:30
    * status = #final
    `);
    const doc = importSingleText(input);
    expect(doc.aliases.size).toBe(1);
    expect(doc.aliases.get('1950-04-01')).toBe('http://aprilfools.com');
    expect(doc.profiles.size).toBe(2);
    const p1 = doc.profiles.get('2000-01');
    expect(p1.name).toBe('2000-01');
    expect((p1.rules[0] as ObeysRule).invariant).toBe('2000-10-31T00:01:02.000+00:00');
    const p2 = doc.profiles.get('2001');
    expect(p2.name).toBe('2001');
    expect(p2.parent).toBe('2000-01');
    expect(doc.extensions.size).toBe(1);
    const e1 = doc.extensions.get('2000-10');
    expect(e1.name).toBe('2000-10');
    expect((e1.rules[0] as BindingRule).valueSet).toBe('2000-10-31');
    expect(doc.valueSets.size).toBe(1);
    const vs1 = doc.valueSets.get('2000-10-31');
    expect(vs1.name).toBe('2000-10-31');
    expect((vs1.rules[0] as ValueSetConceptComponentRule).concepts[0].system).toBe('2000-10-31T00');
    expect((vs1.rules[0] as ValueSetConceptComponentRule).concepts[0].code).toBe('2001-01');
    expect((vs1.rules[1] as ValueSetConceptComponentRule).concepts[0].system).toBe(
      'http://aprilfools.com'
    );
    expect((vs1.rules[1] as ValueSetConceptComponentRule).concepts[0].code).toBe('2001-01-01');
    expect(doc.codeSystems.size).toBe(1);
    const cs1 = doc.codeSystems.get('2000-10-31T00');
    expect(cs1.name).toBe('2000-10-31T00');
    expect((cs1.rules[0] as ConceptRule).code).toBe('2001-01');
    expect(doc.logicals.size).toBe(1);
    const l1 = doc.logicals.get('2000-10-31T00:01');
    expect(l1.name).toBe('2000-10-31T00:01');
    expect((l1.rules[0] as AddElementRule).path).toBe('1999-12-31');
    expect(doc.resources.size).toBe(1);
    const r1 = doc.resources.get('2000-10-31T00:01:02');
    expect(r1.name).toBe('2000-10-31T00:01:02');
    expect((r1.rules[0] as OnlyRule).types[0].type).toBe('2000');
    expect(doc.instances.size).toBe(2);
    const i1 = doc.instances.get('2000-10-31T00:01:02.000');
    expect(i1.name).toBe('2000-10-31T00:01:02.000');
    expect((i1.rules[0] as InsertRule).ruleSet).toBe('12:30');
    const i2 = doc.instances.get('1800-02-28');
    expect(i2.name).toBe('1800-02-28');
    expect(i2.instanceOf).toBe('2000-10-31T00:01');
    expect((i2.rules[0] as AssignmentRule).path).toBe('1999-12-31');
    expect(doc.invariants.size).toBe(1);
    const inv1 = doc.invariants.get('2000-10-31T00:01:02.000+00:00');
    expect(inv1.name).toBe('2000-10-31T00:01:02.000+00:00');
    expect(doc.mappings.size).toBe(1);
    const m1 = doc.mappings.get('12');
    expect(m1.name).toBe('12');
    expect(m1.source).toBe('2000-10-31T00:01');
    expect((m1.rules[0] as MappingRule).path).toBe('1999-12-31');
    expect(doc.ruleSets.size).toBe(1);
    const rs1 = doc.ruleSets.get('12:30');
    expect(rs1.name).toBe('12:30');
    expect(loggerSpy.getAllLogs('error')).toBeEmpty();
    expect(loggerSpy.getAllLogs('warn')).toBeEmpty();
  });

  it('should allow two FSH documents', () => {
    const input = '';
    const input2 = '';
    const results = importText([new RawFSH(input), new RawFSH(input2)]);
    expect(results.length).toBe(2);
    expect(results[0].aliases.size).toBe(0);
    expect(results[0].profiles.size).toBe(0);
    expect(results[0].extensions.size).toBe(0);
    expect(results[1].aliases.size).toBe(0);
    expect(results[1].profiles.size).toBe(0);
    expect(results[1].extensions.size).toBe(0);
  });

  it('should allow two FSH documents even when first is invalid', () => {
    const input = 'invalid FSH string';
    const input2 = '';
    const results = importText([new RawFSH(input, 'Invalid.fsh'), new RawFSH(input2, 'Blank.fsh')]);
    expect(results.length).toBe(2);
    expect(results[0].aliases.size).toBe(0);
    expect(results[0].profiles.size).toBe(0);
    expect(results[0].extensions.size).toBe(0);
    expect(results[1].aliases.size).toBe(0);
    expect(results[1].profiles.size).toBe(0);
    expect(results[1].extensions.size).toBe(0);
  });

  it('should allow a FSH document with a line comment at EOF without newline', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    //Comment`);
    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    expect(loggerSpy.getAllLogs('error').length).toBe(0);
  });

  it('should allow a FSH document with a block comment at EOF without newline', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    /*
    Comment
    Comment
    */`);
    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    expect(loggerSpy.getAllLogs('error').length).toBe(0);
  });

  it('should allow a FSH document with a single-line block comment', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    /* This comment is just one line */
    Title: "Single line comment test"
    `);
    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    expect(loggerSpy.getAllLogs('error').length).toBe(0);
  });

  it('should allow a FSH document with a block comment containing no whitespace', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    /******comment*****/
    Title: "Single line comment test"
    `);
    const result = importSingleText(input);
    expect(loggerSpy.getAllLogs('error').length).toBe(0);
    expect(result.profiles.size).toBe(1);
  });

  it('should adjust indentation of multi-line strings that include blank lines', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    Description: """
    SUSHI stands for:
      SUSHI
      Unshortens
      Short
      Hand
      Inputs

    Recursive acronyms are very popular these days.
    """`);
    const expectedDescription = [
      'SUSHI stands for:',
      '  SUSHI',
      '  Unshortens',
      '  Short',
      '  Hand',
      '  Inputs',
      '',
      'Recursive acronyms are very popular these days.'
    ].join('\n');
    const result = importSingleText(input);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toBe(expectedDescription);
  });

  it('should not change indentation of multi-line strings when there is at least one unindented non-blank line', () => {
    const input = `
    Profile: ObservationProfile
    Parent: Observation
    Description: """A long statement follows this.

Long statement:

 This statement is much longer than the previous statement."""`;
    const expectedDescription = [
      'A long statement follows this.',
      '',
      'Long statement:',
      '',
      ' This statement is much longer than the previous statement.'
    ].join('\n');

    const result = importSingleText(input);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toBe(expectedDescription);
  });

  it('should truncate whitespace lines in multi-line strings', () => {
    const input = leftAlign(`
    Profile: StaircaseObservation
    Parent: Observation
    Description: """
    This
      Description

        Looks
          Like

            A
              Staircase
                """`);
    const expectedDescription = [
      'This',
      '  Description',
      '',
      '    Looks',
      '      Like',
      '',
      '        A',
      '          Staircase'
    ].join('\n');
    const result = importSingleText(input);
    const profile = result.profiles.get('StaircaseObservation');
    expect(profile.description).toBe(expectedDescription);
  });

  it('should parse multi-line strings with CRLF line breaks', () => {
    const input = [
      'Profile: ObservationProfile',
      'Parent: Observation',
      'Description: """',
      'Line endings',
      'are always',
      'troublesome.',
      '"""'
    ].join('\r\n');
    const expectedDescription = ['Line endings', 'are always', 'troublesome.'].join('\n');
    const result = importSingleText(input);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toBe(expectedDescription);
  });

  it('should parse multi-line strings that only occupy one line', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    Description: """Descriptions come in only one size."""
    `);
    const result = importSingleText(input);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toBe('Descriptions come in only one size.');
  });

  it('should parse non-breaking space characters as whitespace', () => {
    const input = leftAlign(`
    Profile:\u00A0NonBreakingObservation
    Parent: Observation\u00A0
    `); // \u00A0 is the non-breaking space character
    const result = importSingleText(input);
    const profile = result.profiles.get('NonBreakingObservation');
    expect(profile.parent).toBe('Observation');
  });

  it('should properly parse a string with newline, return, and tab characters', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    Description: "Here is a \\n new line with some \\t tabbed information. \\r The end."
    `);

    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toEqual(
      'Here is a \n new line with some \t tabbed information. \r The end.'
    );
  });

  it('should properly parse a string with an escaped newline', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    Description: "Here is an escaped \\\\n newline character."
    `);

    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    const profile = result.profiles.get('ObservationProfile');
    expect(profile.description).toEqual('Here is an escaped \\n newline character.');
  });

  it('should properly parse a multiline string with newline, return, and tab characters', () => {
    const input = leftAlign(`
    Profile: ObservationProfile
    Parent: Observation
    Description:
      """
      This is a multi-string description
      with a couple of special characters.

      This special paragraph has info on a \\n new line. And it has some \\t tabbed information. \\r The end.
      """
    `);

    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    const profile = result.profiles.get('ObservationProfile');
    const expectedDescriptionLines = [
      'This is a multi-string description',
      'with a couple of special characters.',
      '',
      'This special paragraph has info on a \n new line. And it has some \t tabbed information. \r The end.'
    ];
    expect(profile.description).toBe(expectedDescriptionLines.join('\n'));
  });

  it('should parse numbers using exponential notation', () => {
    const input = leftAlign(`
    Instance: MyObservation
    InstanceOf: Observation
    * component[0].valueQuantity = 2.3E11 'kg'
    * component[1].valueQuantity = 6.453E+25 's'
    * component[2].valueInteger = 4.50e3
    * component[3].valueSampledData.period = 1.5e-3
    * component[3].valueSampledData.dimensions = 0.88e+6
    * component[3].valueSampledData.origin = 155e-8 'm'
    * component[4].valueInteger = 300.0e-1
    * extension[0].valueDecimal = 48000e-5
    `);

    const result = importSingleText(input, 'Exponential.fsh');
    expect(result.instances.size).toBe(1);
    const instance = result.instances.get('MyObservation');
    assertAssignmentRule(
      instance.rules[0],
      'component[0].valueQuantity',
      new FshQuantity(
        2.3e11,
        new FshCode('kg', 'http://unitsofmeasure.org')
          .withFile('Exponential.fsh')
          .withLocation([4, 39, 4, 42])
      )
        .withFile('Exponential.fsh')
        .withLocation([4, 32, 4, 42])
    );

    assertAssignmentRule(
      instance.rules[1],
      'component[1].valueQuantity',
      new FshQuantity(
        6.453e25,
        new FshCode('s', 'http://unitsofmeasure.org')
          .withFile('Exponential.fsh')
          .withLocation([5, 42, 5, 44])
      )
        .withFile('Exponential.fsh')
        .withLocation([5, 32, 5, 44])
    );
    assertAssignmentRule(instance.rules[2], 'component[2].valueInteger', BigInt(4500));
    assertAssignmentRule(instance.rules[3], 'component[3].valueSampledData.period', 0.0015);
    assertAssignmentRule(
      instance.rules[4],
      'component[3].valueSampledData.dimensions',
      BigInt(880000)
    );
    assertAssignmentRule(
      instance.rules[5],
      'component[3].valueSampledData.origin',
      new FshQuantity(
        155e-8,
        new FshCode('m', 'http://unitsofmeasure.org')
          .withFile('Exponential.fsh')
          .withLocation([9, 49, 9, 51])
      )
        .withFile('Exponential.fsh')
        .withLocation([9, 42, 9, 51])
    );
    assertAssignmentRule(instance.rules[6], 'component[4].valueInteger', BigInt(30));
    assertAssignmentRule(instance.rules[7], 'extension[0].valueDecimal', 0.48);
  });

  it('should log info messages during import', () => {
    const input = leftAlign(`
    Profile: OneProfile
    Parent: Observation

    Extension: OneExtension

    ValueSet: OneValueSet

    CodeSystem: OneCodeSystem

    Logical: OneLogicalModel
    Parent: Base

    Resource: OneResource
    Parent: DomainResource

    Instance: OneInstance
    InstanceOf: Observation
    * status = #final
    * code = #123
    `);
    importSingleText(input);
    const allLogs = loggerSpy.getAllLogs();
    expect(allLogs.length).toBe(2);
    expect(allLogs[0].level).toMatch(/info/);
    expect(allLogs[0].message).toMatch(/Preprocessed/);
    expect(allLogs[1].level).toMatch(/info/);
    expect(allLogs[1].message).toMatch(/Imported 6 definitions and 1 instance/);
  });

  it('should avoid crashing and log error messages because of mismatched input', () => {
    const input = leftAlign(`
    Profile: "BadProfile"

    Profile: BetterProfile
    Id: "BadId"
    Description: BadDescription
    `);
    const result = importSingleText(input, 'Mismatch.fsh');
    const messages = loggerSpy.getAllMessages('error');
    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatch(/BadProfile.*SEQUENCE.*File: Mismatch\.fsh.*Line: 2\D*/s);
    expect(messages[1]).toMatch(/BadId.*SEQUENCE.*File: Mismatch\.fsh.*Line: 5\D*/s);
    expect(messages[2]).toMatch(
      /BadDescription.*{STRING, MULTILINE_STRING}.*File: Mismatch\.fsh.*Line: 6\D*/s
    );
    expect(result).toBeDefined();
  });

  it('should log no error when two entities of different types have the same name', () => {
    const input = `
      CodeSystem: Foo
      Title: "This"

      ValueSet: Foo
      Title: "That"
    `;

    const result = importSingleText(input, 'RepeatedName.fsh');
    expect(result.codeSystems.size).toBe(1);
    expect(result.valueSets.size).toBe(1);
    const codesystem = result.codeSystems.get('Foo');
    expect(codesystem.title).toBe('This');
    const valueSet = result.valueSets.get('Foo');
    expect(valueSet.title).toBe('That');
    expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
  });
});
