import { logger } from '../../src/utils/FSHLogger';
import { LogEntry } from 'winston';

class LoggerSpy {
  private mockWriter = jest.spyOn(logger.transports[0], 'write');

  getAllLogs(): LogEntry[] {
    return this.mockWriter.mock.calls.map(m => m[0]);
  }

  getLogAtIndex(index: number): LogEntry {
    const i = index < 0 ? this.mockWriter.mock.calls.length + index : index;
    return this.mockWriter.mock.calls[i]?.[0];
  }

  getFirstLog(): LogEntry {
    return this.getLogAtIndex(0);
  }

  getLastLog(): LogEntry {
    return this.getLogAtIndex(-1);
  }

  getAllMessages(): string[] {
    return this.getAllLogs().map(l => l.message);
  }

  getMessageAtIndex(index: number): string {
    return this.getLogAtIndex(index)?.message;
  }

  getFirstMessage(): string {
    return this.getMessageAtIndex(0);
  }

  getLastMessage(): string {
    return this.getMessageAtIndex(-1);
  }

  reset(): void {
    this.mockWriter.mockReset();
  }
}

export const loggerSpy = new LoggerSpy();
