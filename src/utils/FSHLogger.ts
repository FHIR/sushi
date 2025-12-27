import { createLogger, format, transports } from 'winston';
import { TransformableInfo } from 'logform';
import chalk from 'chalk';
import cloneDeep from 'lodash/cloneDeep';
import { TextLocation } from '../fshtypes/FshEntity';

const { combine, printf } = format;

interface LoggerInfo extends TransformableInfo {
  file?: string;
  location?: TextLocation;
  appliedFile?: string;
  appliedLocation?: TextLocation;
}

const withLocation = format((info: LoggerInfo) => {
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

const ignoreMessages = format((info: LoggerInfo) => {
  const ignoredMessages =
    info.level === 'warn' ? ignoredWarnings : info.level === 'error' ? ignoredErrors : null;
  const shouldIgnore = ignoredMessages?.some(m => {
    return typeof m === 'string' ? m === info.message : m.test(info.message as string);
  });
  if (shouldIgnore) {
    return (info.level === 'warn' ? stats.numIgnoredWarn++ : stats.numIgnoredError++) && false;
  }
  return info;
});

const incrementCounts = format((info: LoggerInfo) => {
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

const trackErrorsAndWarnings = format((info: LoggerInfo) => {
  if (!errorsAndWarnings.shouldTrack) {
    return info;
  }
  if (info.level === 'error') {
    errorsAndWarnings.errors.push({
      message: info.message as string,
      location: info.location,
      input: info.file
    });
  } else if (info.level === 'warn') {
    errorsAndWarnings.warnings.push({
      message: info.message as string,
      location: info.location,
      input: info.file
    });
  }
  return info;
});

const printer = printf((info: LoggerInfo) => {
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
    ignoreMessages(),
    incrementCounts(),
    trackErrorsAndWarnings(),
    withLocation(),
    printer
  ),
  transports: [new transports.Console()]
});

function parseIgnoredLogsConfiguration(config: string) {
  return config
    .split(/\r?\n/)
    .map(m => m.trim())
    .filter(m => m.length && !m.startsWith('#'))
    .map(m => {
      if (m.startsWith('/') && m.endsWith('/')) {
        return new RegExp(m.slice(1, -1));
      } else {
        return m;
      }
    });
}

let ignoredWarnings: (string | RegExp)[];
export const setIgnoredWarnings = (ignoredWarningsConfig: string): void => {
  ignoredWarnings = parseIgnoredLogsConfiguration(ignoredWarningsConfig);
};

let ignoredErrors: (string | RegExp)[];
export const setIgnoredErrors = (ignoredErrorsConfig: string): void => {
  ignoredErrors = parseIgnoredLogsConfiguration(ignoredErrorsConfig);
};

class LoggerStats {
  public numInfo = 0;
  public numWarn = 0;
  public numError = 0;
  public numDebug = 0;
  public numIgnoredWarn = 0;
  public numIgnoredError = 0;

  reset(): void {
    this.numInfo = 0;
    this.numWarn = 0;
    this.numError = 0;
    this.numDebug = 0;
    this.numIgnoredWarn = 0;
    this.numIgnoredError = 0;
  }
}

export const stats = new LoggerStats();

export class ErrorsAndWarnings {
  public errors: { message: string; location?: TextLocation; input?: string }[] = [];
  public warnings: { message: string; location?: TextLocation; input?: string }[] = [];
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

export const logMessage = (level: string, message: string): void => {
  logger.log(level, message);
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
  stats.numIgnoredWarn = loggerDataToRestore.stats.numIgnoredWarn;
  stats.numIgnoredError = loggerDataToRestore.stats.numIgnoredError;
  return secretErrorsAndWarnings;
}
