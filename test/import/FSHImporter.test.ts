import { importText, FSHImporter, FSHDocument } from '../../src/import';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { FshCode } from '../../src/fshtypes';
import { assertFixedValueRule } from '../testhelpers/asserts';

describe('FSHImporter', () => {
  it('should default filename to blank string', () => {
    const input = '';
    const result = importText(input);
    expect(result.file).toBe('');
  });

  it('should retain the passed in file name', () => {
    const input = '';
    const result = importText(input, 'FSHImporter.test.ts');
    expect(result.file).toBe('FSHImporter.test.ts');
  });

  it('should allow a blank FSH document', () => {
    const input = '';
    const result = importText(input);
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
    importText(input, 'Pizza.fsh');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Pizza\.fsh.*Line: 3\D/s);
  });

  it('should report extraneous input errors from antlr', () => {
    const input = `
    Profile: Something Spaced
    Parent: Spacious
    `;
    importText(input, 'Space.fsh');
    expect(loggerSpy.getLastMessage()).toMatch(/File: Space\.fsh.*Line: 2\D/s);
  });

  it('should parse escaped double-quote and backslash characters in strings', () => {
    const input = `
    Profile: Escape
    Parent: Observation
    Title: "Can \\"you\\" escape \\\\ this \\\\ string?"
    * code = #"This \\\\ code \\"is quite\\" challenging \\\\to escape"
    `;
    const result = importText(input, 'Escape.fsh');
    const profile = result.profiles.get('Escape');
    expect(profile.title).toBe('Can "you" escape \\ this \\ string?');
    const expectedCode = new FshCode('This \\ code "is quite" challenging \\to escape')
      .withLocation([5, 14, 5, 65])
      .withFile('Escape.fsh');
    expect(profile.rules).toHaveLength(1);
    assertFixedValueRule(profile.rules[0], 'code', expectedCode);
  });
});
