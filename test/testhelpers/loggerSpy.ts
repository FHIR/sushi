import { logger } from '../../src/utils/FSHLogger';
import { LogEntry } from 'winston';

class LoggerSpy {
  private mockWriter = jest.spyOn(logger.transports[0], 'write');

  getAllLogs(level?: string): LogEntry[] {
    const logs = this.mockWriter.mock.calls.map(m => m[0]);
    if (level) {
      return logs.filter(entry => RegExp(level).test(entry.level));
    } else {
      return logs;
    }
  }

  getLogAtIndex(index: number, level?: string): LogEntry {
    const logs = this.getAllLogs(level);
    const i = index < 0 ? logs.length + index : index;
    return logs[i];
  }

  getFirstLog(level?: string): LogEntry {
    return this.getLogAtIndex(0, level);
  }

  getLastLog(level?: string): LogEntry {
    return this.getLogAtIndex(-1, level);
  }

  getAllMessages(level?: string): string[] {
    return this.getAllLogs(level).map(l => l.message);
  }

  getMessageAtIndex(index: number, level?: string): string {
    return this.getLogAtIndex(index, level)?.message;
  }

  getFirstMessage(level?: string): string {
    return this.getMessageAtIndex(0, level);
  }

  getLastMessage(level?: string): string {
    return this.getMessageAtIndex(-1, level);
  }

  reset(): void {
    this.mockWriter.mockReset();
  }
}

export const loggerSpy = new LoggerSpy();
