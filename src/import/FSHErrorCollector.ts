import { Recognizer, Token } from 'antlr4';
import { FSHErrorListener } from './FSHErrorListener';

export class FSHErrorCollector extends FSHErrorListener {
  readonly errorMessages: string[] = [];

  constructor() {
    super();
  }

  syntaxError(
    recognizer: Recognizer,
    offendingSymbol: Token,
    line: number,
    column: number,
    msg: string
  ): void {
    const { message } = this.buildErrorMessage(recognizer, offendingSymbol, line, column, msg);
    this.errorMessages.push(message);
  }
}
