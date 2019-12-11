import { ErrorListener } from 'antlr4/error';
import { logger } from '../utils/FSHLogger';
import { Recognizer, Token } from 'antlr4';

export class FSHErrorListener extends ErrorListener {
  constructor(readonly file: string) {
    super();
  }

  syntaxError(
    recognizer: Recognizer,
    offendingSymbol: Token,
    line: number,
    column: number,
    msg: string
  ): void {
    logger.error(msg, {
      file: this.file,
      location: {
        startLine: line,
        startColumn: column + 1,
        endLine: line,
        endColumn: column + offendingSymbol.text.length
      }
    });
  }
}
