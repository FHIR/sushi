import { Recognizer, Token } from 'antlr4';
import { logger } from '../utils/FSHLogger';
import { FSHErrorListener } from './FSHErrorListener';

export class FSHErrorPrinter extends FSHErrorListener {
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
    const { message, location } = this.buildErrorMessage(
      recognizer,
      offendingSymbol,
      line,
      column,
      msg
    );
    logger.error(message, { file: this.file, location });
  }
}
