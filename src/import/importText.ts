import { FSHImporter } from './FSHImporter';
import { FSHDocument } from './FSHDocument';
import { RawFSH } from './RawFSH';

/**
 * Parses various text strings into individual FSHDocuments.
 * @param {RawFSH[]} rawFSHes - the list of RawFSH to parse into FSHDocuments
 * @returns {FSHDocument[]} - the FSH documents representing each parsed text
 */
export function importText(rawFSHes: RawFSH[]): FSHDocument[] {
  const importer = new FSHImporter();

  return importer.import(rawFSHes);
}
