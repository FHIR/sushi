import { createLogger, format, transports } from 'winston';

const { combine, colorize, simple } = format;

export const logger = createLogger({
  format: combine(colorize({ all: true }), simple()),
  transports: [new transports.Console()]
});
