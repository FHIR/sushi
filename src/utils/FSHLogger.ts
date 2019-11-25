import { createLogger, format, transports } from 'winston';

const { combine, colorize, simple } = format;

const withLocation = format((info, opts) => {
  if (info.file) {
    info.message += `\nFile: ${info.file}`;
    delete info.file;
  }
  if (info.location) {
    info.message += `\nFrom: (Line ${info.location.startLine}, Column ${info.location.startColumn})`;
    info.message += `\nTo: (Line ${info.location.endLine}, Column ${info.location.endColumn})`;
    delete info.location;
  }
  return info;
});

export const logger = createLogger({
  format: combine(withLocation(), colorize({ all: true }), simple()),
  transports: [new transports.Console()]
});
