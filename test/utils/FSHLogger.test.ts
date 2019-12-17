import { logger, stats } from '../../src/utils/FSHLogger';

describe('FSHLogger', () => {
  beforeEach(() => {
    stats.reset();
  });

  it('should store number of logger info messages', () => {
    logger.info('info1');
    expect(stats.numInfo).toBe(1);
    logger.info('info2');
    expect(stats.numInfo).toBe(2);
  });

  it('should store number of logger warning messages', () => {
    logger.warn('warn1');
    expect(stats.numWarn).toBe(1);
    logger.warn('warn2');
    expect(stats.numWarn).toBe(2);
  });

  it('should store number of logger error messages', () => {
    logger.error('error1');
    expect(stats.numError).toBe(1);
    logger.error('error2');
    expect(stats.numError).toBe(2);
  });

  it('should store number of logger messages of all types simultaneously', () => {
    logger.error('error1');
    expect(stats.numInfo).toBe(0);
    expect(stats.numWarn).toBe(0);
    expect(stats.numError).toBe(1);
    logger.info('info1');
    expect(stats.numInfo).toBe(1);
    expect(stats.numWarn).toBe(0);
    expect(stats.numError).toBe(1);
    logger.warn('warn1');
    expect(stats.numInfo).toBe(1);
    expect(stats.numWarn).toBe(1);
    expect(stats.numError).toBe(1);
    logger.info('info2');
    expect(stats.numInfo).toBe(2);
    expect(stats.numWarn).toBe(1);
    expect(stats.numError).toBe(1);
  });

  it('should correctly reset the stats', () => {
    logger.info('info1');
    logger.warn('warn1');
    logger.error('error1');
    expect(stats.numInfo).toBe(1);
    expect(stats.numWarn).toBe(1);
    expect(stats.numError).toBe(1);
    stats.reset();
    expect(stats.numInfo).toBe(0);
    expect(stats.numWarn).toBe(0);
    expect(stats.numError).toBe(0);
  });
});
