import { importText, RawFSH } from '../../src/import';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';
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

  it('should log info messages during import', () => {
    const input = '';
    importSingleText(input);
    const allLogs = loggerSpy.getAllLogs();
    expect(allLogs.length).toBe(2);
    expect(allLogs[0].level).toMatch(/info/);
    expect(allLogs[0].message).toMatch(/Preprocessed/);
    expect(allLogs[1].level).toMatch(/info/);
    expect(allLogs[1].message).toMatch(/Imported 0 definitions/);
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
});
