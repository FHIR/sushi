import { importText, RawFSH } from '../../src/import';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';
import { assertFixedValueRule } from '../testhelpers/asserts';
import { importSingleText } from '../testhelpers/importSingleText';

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

  it('should report mismatched input errors from antlr', () => {
    const input = `
    Profile: MismatchedPizza
    Pizza: Large
    `;
    importSingleText(input, 'Pizza.fsh');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Pizza\.fsh.*Line: 3\D/s);
  });

  it('should report extraneous input errors from antlr', () => {
    const input = `
    Profile: Something Spaced
    Parent: Spacious
    `;
    importSingleText(input, 'Space.fsh');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Space\.fsh.*Line: 2\D/s);
  });

  it('should recover from extraneous input errors from antlr', () => {
    const input = `
    OOPS!

    Profile: Foo
    Parent: FooDad
    `;
    const result = importSingleText(input, 'Extra.fsh');
    const profile = result.profiles.get('Foo');
    expect(profile.name).toBe('Foo');
    expect(profile.parent).toBe('FooDad');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Extra\.fsh.*Line: 2\D/s);
  });

  it('should parse escaped double-quote and backslash characters in strings', () => {
    const input = `
    Profile: Escape
    Parent: Observation
    Title: "Can \\"you\\" escape \\\\ this \\\\ string?"
    * code = #"This \\\\ code \\"is quite\\" challenging \\\\to escape"
    `;
    const result = importSingleText(input, 'Escape.fsh');
    const profile = result.profiles.get('Escape');
    expect(profile.title).toBe('Can "you" escape \\ this \\ string?');
    const expectedCode = new FshCode('This \\ code "is quite" challenging \\to escape')
      .withLocation([5, 14, 5, 65])
      .withFile('Escape.fsh');
    expect(profile.rules).toHaveLength(1);
    assertFixedValueRule(profile.rules[0], 'code', expectedCode);
  });

  it('should parse a rule with an identifying integer', () => {
    const input = `
    Profile: IdentifyingInteger
    Parent: Observation
    *123 code = #"This rule is identified"
    `;
    const result = importSingleText(input, 'IdentifyingInteger.fsh');
    const profile = result.profiles.get('IdentifyingInteger');
    const expectedCode = new FshCode('This rule is identified')
      .withLocation([4, 17, 4, 42])
      .withFile('IdentifyingInteger.fsh');
    expect(profile.rules).toHaveLength(1);
    assertFixedValueRule(profile.rules[0], 'code', expectedCode);
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
    const input = `
    Profile: ObservationProfile
    Parent: Observation
    //Comment`;
    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    expect(loggerSpy.getAllLogs().length).toBe(0);
  });

  it('should allow a FSH document with a block comment at EOF without newline', () => {
    const input = `
    Profile: ObservationProfile
    Parent: Observation
    /*
    Comment
    Comment
    */`;
    const result = importSingleText(input);
    expect(result.profiles.size).toBe(1);
    expect(loggerSpy.getAllLogs().length).toBe(0);
  });
});
