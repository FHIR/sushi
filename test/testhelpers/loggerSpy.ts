import { Logger } from 'winston';

export class LoggerSpy {
  private mockWriter: jest.SpyInstance<boolean, [any, string, ((error: Error) => void)?]>;

  constructor(logger: Logger) {
    this.mockWriter = jest.spyOn(logger.transports[0], 'write');
  }

  getMessageAtIndex(index: number, reverse = false): string {
    const i = reverse ? this.mockWriter.mock.calls.length - index - 1 : index;
    return this.mockWriter.mock.calls[i][0].message;
  }

  getFirstMessage(): string {
    return this.getMessageAtIndex(0);
  }

  getLastMessage(): string {
    return this.getMessageAtIndex(this.mockWriter.mock.calls.length - 1);
  }
}
