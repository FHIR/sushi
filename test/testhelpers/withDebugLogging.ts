import { logger } from '../../src/utils';

export function withDebugLogging(fn: () => any) {
  const originalLevel = logger.level;
  logger.level = 'debug';
  try {
    fn();
  } finally {
    // make sure we set the logger back so we don't mess up other tests
    logger.level = originalLevel;
  }
}
