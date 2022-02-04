import { logger } from '../../src/utils/FSHLogger';
import { LogEntry } from 'winston';
import { logger as packageLoadLogger } from 'fhir-package-load';

// MUTE_LOGS controls whether or not logs get printed during testing.
// Usually, we don't want logs actually printed, as they cause clutter.
const MUTE_LOGS = true;

// Winston levels: https://github.com/winstonjs/winston#logging-levels
type Level = 'silly' | 'debug' | 'verbose' | 'http' | 'info' | 'warn' | 'error';

class LoggerSpy {
  private mockWriter = jest.spyOn(logger.transports[0], 'write');
  private packageLoadMockWriter = jest.spyOn(packageLoadLogger.transports[0], 'write');
  constructor() {
    if (MUTE_LOGS) {
      this.mockWriter = this.mockWriter.mockImplementation(() => true);
      this.packageLoadMockWriter = this.packageLoadMockWriter.mockImplementation(() => true);
    }
  }

  getAllLogs(level?: Level): LogEntry[] {
    const logs = this.mockWriter.mock.calls.map(m => m[0]);
    if (level) {
      return logs.filter(entry => RegExp(level).test(entry.level));
    } else {
      return logs;
    }
  }

  getLogAtIndex(index: number, level?: Level): LogEntry {
    const logs = this.getAllLogs(level);
    const i = index < 0 ? logs.length + index : index;
    return logs[i];
  }

  getFirstLog(level?: Level): LogEntry {
    return this.getLogAtIndex(0, level);
  }

  getLastLog(level?: Level): LogEntry {
    return this.getLogAtIndex(-1, level);
  }

  getAllMessages(level?: Level): string[] {
    return this.getAllLogs(level).map(l => l.message);
  }

  getMessageAtIndex(index: number, level?: Level): string {
    return this.getLogAtIndex(index, level)?.message;
  }

  getFirstMessage(level?: Level): string {
    return this.getMessageAtIndex(0, level);
  }

  getLastMessage(level?: Level): string {
    return this.getMessageAtIndex(-1, level);
  }

  reset(): void {
    this.mockWriter.mockReset();
  }
}

export const loggerSpy = new LoggerSpy();
