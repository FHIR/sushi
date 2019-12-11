import { createLogger, format, transports } from 'winston';

const { combine, colorize, simple } = format;

const withLocation = format(info => {
  if (info.file) {
    info.message += `\n  File: ${info.file}`;
    delete info.file;
  }
  if (info.location) {
    info.message += `\n  Line: ${info.location.startLine}`;
    if (info.location.endLine !== info.location.startLine) {
      info.message += ` - ${info.location.endLine}`;
    }
    delete info.location;
  }
  return info;
});

const incrementCounts = format(info => {
  if (info.level === 'info') stats.numInfo++;
  if (info.level === 'warn') stats.numWarn++;
  if (info.level === 'error') stats.numError++;
  return info;
});

export const logger = createLogger({
  format: combine(incrementCounts(), withLocation(), colorize({ all: true }), simple()),
  transports: [new transports.Console()]
});

class LoggerStats {
  public numInfo = 0;
  public numWarn = 0;
  public numError = 0;
}

export const stats = new LoggerStats();
