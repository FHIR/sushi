import { InputStream, CommonTokenStream } from 'antlr4/index';
import { FSHLexer } from './generated/FSHLexer';
import { FSHParser } from './generated/FSHParser';
import { DocContext } from './parserContexts';
import { FSHImporter } from './FSHImporter';
import { FSHDocument } from './FSHDocument';
import { FSHErrorListener } from './FSHErrorListener';

/**
 * Parses a text string as a FSHDocument.
 * @param {string} text - the FSH text to parse
 * @param {string} file - the file name to record as the text source
 * @returns {FSHDocument} - the FSH document representing the parsed text
 */
export function importText(text: string, file?: string): FSHDocument {
  const importer = new FSHImporter(file);
  return importer.visitDoc(parseDoc(text, file));
}

// NOTE: Since the ANTLR parser/lexer is JS (not typescript), we need to use some ts-ignore here.
function parseDoc(input: string, file?: string): DocContext {
  const chars = new InputStream(input);
  const lexer = new FSHLexer(chars);
  const listener = new FSHErrorListener(file);
  // @ts-ignore
  lexer.removeErrorListeners();
  // @ts-ignore
  lexer.addErrorListener(listener);
  // @ts-ignore
  const tokens = new CommonTokenStream(lexer);
  const parser = new FSHParser(tokens);
  // @ts-ignore
  parser.removeErrorListeners();
  // @ts-ignore
  parser.addErrorListener(listener);
  // @ts-ignore
  parser.buildParseTrees = true;
  // @ts-ignore
  return parser.doc() as DocContext;
}
