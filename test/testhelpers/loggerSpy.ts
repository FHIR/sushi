import { logger } from '../../src/utils/FSHLogger';

class LoggerSpy {
  private mockWriter = jest.spyOn(logger.transports[0], 'write');

  getMessageAtIndex(index: number): string {
    const i = index < 0 ? this.mockWriter.mock.calls.length + index : index;
    return this.mockWriter.mock.calls[i][0].message;
  }

  getFirstMessage(): string {
    return this.getMessageAtIndex(0);
  }

  getLastMessage(): string {
    return this.getMessageAtIndex(-1);
  }
}

export const loggerSpy = new LoggerSpy();
