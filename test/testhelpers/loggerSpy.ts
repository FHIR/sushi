import { logger } from '../../src/utils/FSHLogger';

class LoggerSpy {
  private mockWriter = jest.spyOn(logger.transports[0], 'write');

  getMessageAtIndex(index: number, reverse = false): string {
    const i = reverse ? this.mockWriter.mock.calls.length - index - 1 : index;
    return this.mockWriter.mock.calls[i][0].message;
  }

  getFirstMessage(): string {
    return this.getMessageAtIndex(0);
  }

  getLastMessage(): string {
    return this.getMessageAtIndex(0, true);
  }
}

export const loggerSpy = new LoggerSpy();
