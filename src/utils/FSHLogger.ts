import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';

const { combine, printf } = format;

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
  if (info.appliedFile) {
    info.message += `\n  Applied in File: ${info.appliedFile}`;
    delete info.appliedFile;
  }
  if (info.appliedLocation) {
    info.message += `\n  Applied on Line: ${info.appliedLocation.startLine}`;
    if (info.appliedLocation.endLine !== info.appliedLocation.startLine) {
      info.message += ` - ${info.appliedLocation.endLine}`;
    }
    delete info.appliedLocation;
  }
  return info;
});

const incrementCounts = format(info => {
  switch (info.level) {
    case 'info':
      stats.numInfo++;
      break;
    case 'warn':
      stats.numWarn++;
      break;
    case 'error':
      stats.numError++;
      break;
    case 'debug':
      stats.numDebug++;
      break;
    default:
      break;
  }

  return info;
});

const trackErrorsAndWarnings = format(info => {
  if (!errorsAndWarnings.shouldTrack) {
    return info;
  }
  if (info.level === 'error') {
    errorsAndWarnings.errors.push({ message: info.message, location: info.location });
  } else if (info.level === 'warn') {
    errorsAndWarnings.warnings.push({ message: info.message, location: info.location });
  }
  return info;
});

const printer = printf(info => {
  let level;
  switch (info.level) {
    case 'info':
      level = chalk.whiteBright.bgGreen(`${info.level} `);
      break;
    case 'warn':
      // (179, 98, 0) = dark dark orange
      level = chalk.whiteBright.bgRgb(179, 98, 0)(`${info.level} `);
      break;
    case 'error':
      level = chalk.whiteBright.bgRed(`${info.level}`);
      break;
    case 'debug':
      level = chalk.whiteBright.bgBlue(`${info.level}`);
      break;
    default:
      break;
  }
  return `${level} ${info.message}`;
});

export const logger = createLogger({
  format: combine(incrementCounts(), trackErrorsAndWarnings(), withLocation(), printer),
  transports: [new transports.Console()]
});

class LoggerStats {
  public numInfo = 0;
  public numWarn = 0;
  public numError = 0;
  public numDebug = 0;

  reset(): void {
    this.numInfo = 0;
    this.numWarn = 0;
    this.numError = 0;
    this.numDebug = 0;
  }
}

export const stats = new LoggerStats();

class ErrorsAndWarnings {
  public errors: { message: string; location: string }[] = [];
  public warnings: { message: string; location: string }[] = [];
  public shouldTrack = false;
}

export const errorsAndWarnings = new ErrorsAndWarnings();
