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

export const logger = createLogger({
  format: combine(withLocation(), colorize({ all: true }), simple()),
  transports: [new transports.Console()]
});
