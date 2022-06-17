import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';
import cloneDeep from 'lodash/cloneDeep';

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

const ignoreWarnings = format(info => {
  // Only warnings can be ignored
  if (info.level !== 'warn') {
    return info;
  }
  const shouldIgnore = ignoredWarnings?.some(m => {
    return typeof m === 'string' ? m === info.message : m.test(info.message);
  });
  return shouldIgnore ? false : info;
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
    errorsAndWarnings.errors.push({
      message: info.message,
      location: info.location,
      input: info.file
    });
  } else if (info.level === 'warn') {
    errorsAndWarnings.warnings.push({
      message: info.message,
      location: info.location,
      input: info.file
    });
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
  format: combine(
    ignoreWarnings(),
    incrementCounts(),
    trackErrorsAndWarnings(),
    withLocation(),
    printer
  ),
  transports: [new transports.Console()]
});

let ignoredWarnings: (string | RegExp)[];
export const setIgnoredWarnings = (messages: string): void => {
  ignoredWarnings = messages
    .split(/\r?\n/)
    .map(m => m.trim())
    .filter(m => !m.startsWith('#'))
    .map(m => {
      if (m.startsWith('/') && m.endsWith('/')) {
        return new RegExp(m.slice(1, -1));
      } else {
        return m;
      }
    });
};

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

export class ErrorsAndWarnings {
  public errors: { message: string; location?: any; input?: string }[] = [];
  public warnings: { message: string; location?: any; input?: string }[] = [];
  public shouldTrack = false;

  reset(): void {
    this.errors = [];
    this.warnings = [];
    this.shouldTrack = false;
  }
}

export const errorsAndWarnings = new ErrorsAndWarnings();

export type LoggerData = {
  level: string;
  errorsAndWarnings: ErrorsAndWarnings;
  stats: LoggerStats;
};

export function switchToSecretLogger(): LoggerData {
  // by setting the logger level to the highest level possible,
  // console output is suppressed, while still calling all the functions
  // defined in the logger's format.
  const oldLevel = logger.level;
  logger.level = 'emerg';
  const oldErrorsAndWarnings = cloneDeep(errorsAndWarnings);
  errorsAndWarnings.reset();
  errorsAndWarnings.shouldTrack = true;
  const oldStats = cloneDeep(stats);
  stats.reset();
  return { level: oldLevel, errorsAndWarnings: oldErrorsAndWarnings, stats: oldStats };
}

export function restoreMainLogger(loggerDataToRestore: LoggerData): ErrorsAndWarnings {
  logger.level = loggerDataToRestore.level;
  const secretErrorsAndWarnings = cloneDeep(errorsAndWarnings);
  errorsAndWarnings.reset();
  errorsAndWarnings.errors = loggerDataToRestore.errorsAndWarnings.errors;
  errorsAndWarnings.warnings = loggerDataToRestore.errorsAndWarnings.warnings;
  errorsAndWarnings.shouldTrack = loggerDataToRestore.errorsAndWarnings.shouldTrack;
  stats.numInfo = loggerDataToRestore.stats.numInfo;
  stats.numWarn = loggerDataToRestore.stats.numWarn;
  stats.numError = loggerDataToRestore.stats.numError;
  stats.numDebug = loggerDataToRestore.stats.numDebug;
  return secretErrorsAndWarnings;
}
