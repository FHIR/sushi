import { InputStream, CommonTokenStream } from 'antlr4/index';
import { FSHLexer } from './generated/FSHLexer';
import { FSHParser } from './generated/FSHParser';
import { DocContext } from './parserContexts';
import { FSHImporter } from './FSHImporter';
import { FSHDocument } from './FSHDocument';
import { FSHErrorListener } from './FSHErrorListener';
import { FileInfo } from './FileInfo';

/**
 * Parses various text strings into individual FSHDocuments.
 * @param {FileInfo[]} filesInfo - the list of FileInfo to parse into FSHDocuments
 * @returns {FSHDocument[]} - the FSH documents representing each parsed text
 */
export function importText(filesInfo: FileInfo[]): FSHDocument[] {
  const docs: FSHDocument[] = [];
  for (const fileInfo of filesInfo) {
    const importer = new FSHImporter(fileInfo.path);
    const doc = importer.visitDoc(parseDoc(fileInfo.content, fileInfo.path));
    if (doc) docs.push(doc);
  }

  return docs;
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
