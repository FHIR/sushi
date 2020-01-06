import { InputStream, CommonTokenStream } from 'antlr4/index';
import { FSHLexer } from './generated/FSHLexer';
import { FSHParser } from './generated/FSHParser';
import { DocContext } from './parserContexts';
import { FSHImporter } from './FSHImporter';
import { FSHDocument } from './FSHDocument';
import { FSHErrorListener } from './FSHErrorListener';
import { RawFSH } from './RawFSH';
import flatMap from 'lodash/flatMap';

/**
 * Parses various text strings into individual FSHDocuments.
 * @param {RawFSH[]} rawFSHes - the list of RawFSH to parse into FSHDocuments
 * @returns {FSHDocument[]} - the FSH documents representing each parsed text
 */
export function importText(rawFSHes: RawFSH[]): FSHDocument[] {
  const importers: FSHImporter[] = [];
  const contexts: DocContext[] = [];
  rawFSHes.forEach(RawFSH => {
    importers.push(new FSHImporter(RawFSH.path));
    contexts.push(parseDoc(RawFSH.content, RawFSH.path));
  });

  // Import all aliases first
  const allAliases = new Map(
    flatMap(
      importers.map((importer, index) => {
        const context = contexts[index];
        return importer.getAliases(context);
      }),
      aliases => Array.from(aliases)
    )
  );

  const docs: FSHDocument[] = [];
  importers.forEach((importer, index) => {
    const context = contexts[index];
    const doc = importer.visitDoc(context, allAliases);
    if (doc) docs.push(doc);
  });

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
