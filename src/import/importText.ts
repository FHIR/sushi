import { InputStream, CommonTokenStream } from 'antlr4/index';
import { FSHLexer } from '../../src/import/generated/FSHLexer';
import { FSHParser } from '../../src/import/generated/FSHParser';
import { DocContext } from '../../src/import/parserContexts';
import { FSHImporter } from './FSHImporter';
import { FSHDocument } from './FSHDocument';

/**
 * Parses a text string as a FSHDocument.
 * @param {string} text - the FSH text to parse
 * @paran {string} file - the file name to record as the text source
 * @returns {FSHDocument} - the FSH document representing the parsed text
 */
export function importText(text: string, file?: string): FSHDocument {
  const importer = new FSHImporter(file);
  return importer.visitDoc(parseDoc(text));
}

// NOTE: Since the ANTLR parser/lexer is JS (not typescript), we need to use some ts-ignore here.
function parseDoc(input: string): DocContext {
  const chars = new InputStream(input);
  const lexer = new FSHLexer(chars);
  // @ts-ignore
  const tokens = new CommonTokenStream(lexer);
  const parser = new FSHParser(tokens);
  // @ts-ignore
  parser.buildParseTrees = true;
  // @ts-ignore
  return parser.doc() as DocContext;
}
