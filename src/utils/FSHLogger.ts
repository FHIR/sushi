import { Logger, createLogger, format, transports } from 'winston';

const { combine, colorize, simple } = format;

export const logger: Logger = createLogger({
  format: combine(colorize({ all: true }), simple()),
  transports: [new transports.Console()]
});
