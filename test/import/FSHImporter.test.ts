import { importText, FSHImporter, FSHDocument } from '../../src/import';

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
});
