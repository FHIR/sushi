import { importText, FSHDocument, RawFSH } from '../../src/import';

export function importSingleText(content: string, path?: string): FSHDocument {
  return importText([new RawFSH(content, path)])[0];
}
