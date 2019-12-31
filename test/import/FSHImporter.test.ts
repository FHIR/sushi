import { importText, FSHImporter, FSHDocument, FileInfo } from '../../src/import';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';
import { assertFixedValueRule } from '../testhelpers/asserts';

describe('FSHImporter', () => {
  it('should default filename to blank string', () => {
    const input = '';
    const result = importText([new FileInfo(input)])[0];
    expect(result.file).toBe('');
  });

  it('should retain the passed in file name', () => {
    const input = '';
    const result = importText([new FileInfo(input, 'FSHImporter.test.ts')])[0];
    expect(result.file).toBe('FSHImporter.test.ts');
  });

  it('should allow a blank FSH document', () => {
    const input = '';
    const result = importText([new FileInfo(input)])[0];
    expect(result.aliases.size).toBe(0);
    expect(result.profiles.size).toBe(0);
    expect(result.extensions.size).toBe(0);
  });

  it('should not allow the same visitor instance to be invoked twice', () => {
    const visitor = new FSHImporter();
    // First time should work (ts-ignore is to get around typing of DocContext for now)
    // @ts-ignore
    const result = visitor.visitDoc({ entity: () => [] });
    expect(result).toBeInstanceOf(FSHDocument);

    // Second time should not work
    // @ts-ignore
    const result2 = visitor.visitDoc({ entity: () => [] });
    expect(result2).toBeUndefined();
  });

  it('should report mismatched input errors from antlr', () => {
    const input = `
    Profile: MismatchedPizza
    Pizza: Large
    `;
    importText([new FileInfo(input, 'Pizza.fsh')])[0];
    expect(loggerSpy.getLastMessage()).toMatch(/File: Pizza\.fsh.*Line: 3\D/s);
  });

  it('should report extraneous input errors from antlr', () => {
    const input = `
    Profile: Something Spaced
    Parent: Spacious
    `;
    importText([new FileInfo(input, 'Space.fsh')])[0];
    expect(loggerSpy.getLastMessage()).toMatch(/File: Space\.fsh.*Line: 2\D/s);
  });

  it('should parse escaped double-quote and backslash characters in strings', () => {
    const input = `
    Profile: Escape
    Parent: Observation
    Title: "Can \\"you\\" escape \\\\ this \\\\ string?"
    * code = #"This \\\\ code \\"is quite\\" challenging \\\\to escape"
    `;
    const result = importText([new FileInfo(input, 'Escape.fsh')])[0];
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
    const result = importText([new FileInfo(input, 'IdentifyingInteger.fsh')])[0];
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
    const results = importText([new FileInfo(input), new FileInfo(input2)]);
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
    const results = importText([
      new FileInfo(input, 'Invalid.fsh'),
      new FileInfo(input2, 'Blank.fsh')
    ]);
    expect(results.length).toBe(2);
    expect(results[0].aliases.size).toBe(0);
    expect(results[0].profiles.size).toBe(0);
    expect(results[0].extensions.size).toBe(0);
    expect(results[1].aliases.size).toBe(0);
    expect(results[1].profiles.size).toBe(0);
    expect(results[1].extensions.size).toBe(0);
  });
});
