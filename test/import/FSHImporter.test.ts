import { importText, FSHImporter, FSHDocument } from '../../src/import';
import { logger } from '../../src/utils/FSHLogger';

describe('FSHImporter', () => {
  let mockWriter: jest.SpyInstance<boolean, [any, string, ((error: Error) => void)?]>;

  beforeAll(() => {
    mockWriter = jest.spyOn(logger.transports[0], 'write');
  });

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
    expect(mockWriter.mock.calls[mockWriter.mock.calls.length - 1][0].message).toMatch(
      /File: Pizza\.fsh.*Line: 3\D/s
    );
  });

  it('should report extraneous input errors from antlr', () => {
    const input = `
    Profile: Something Spaced
    Parent: Spacious
    `;
    importText(input, 'Space.fsh');
    expect(mockWriter.mock.calls[mockWriter.mock.calls.length - 1][0].message).toMatch(
      /File: Space\.fsh.*Line: 2\D/s
    );
  });
});
