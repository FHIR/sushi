import { logger, stats, errorsAndWarnings, setIgnoredWarnings } from '../../src/utils/FSHLogger';
import { leftAlign } from './leftAlign';
// MUTE_LOGS controls whether or not logs get printed during testing.
// Usually, we don't want logs actually printed, as they cause clutter.
const MUTE_LOGS = true;

describe('FSHLogger', () => {
  let originalWriteFn = logger.transports[0]['write'];

  beforeEach(() => {
    stats.reset();
    errorsAndWarnings.reset();
    if (MUTE_LOGS) {
      originalWriteFn = logger.transports[0]['write'];
      logger.transports[0]['write'] = jest.fn(() => true);
    }
  });

  afterEach(() => {
    if (MUTE_LOGS) {
      logger.transports[0]['write'] = originalWriteFn;
    }
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

  it('should not track errors and warnings when shouldTrack is false', () => {
    logger.warn('warn1');
    logger.error('error1');
    expect(errorsAndWarnings.shouldTrack).toBe(false);
    expect(errorsAndWarnings.errors).toHaveLength(0);
    expect(errorsAndWarnings.warnings).toHaveLength(0);
  });

  it('should track errors and warnings when shouldTrack is true', () => {
    errorsAndWarnings.shouldTrack = true;
    logger.warn('warn1', {
      location: {
        startLine: 1,
        startColumm: 2,
        endLine: 3,
        endColumn: 4
      },
      file: 'Input_0'
    });
    logger.warn('warn2');
    logger.error('error1');
    logger.error('error2');
    expect(errorsAndWarnings.shouldTrack).toBe(true);
    expect(errorsAndWarnings.warnings).toHaveLength(2);
    expect(errorsAndWarnings.warnings).toContainEqual({
      location: {
        startLine: 1,
        startColumm: 2,
        endLine: 3,
        endColumn: 4
      },
      message: 'warn1',
      input: 'Input_0'
    });
    expect(errorsAndWarnings.warnings).toContainEqual({ message: 'warn2' });
    expect(errorsAndWarnings.errors).toHaveLength(2);
    expect(errorsAndWarnings.errors).toContainEqual({ message: 'error1' });
    expect(errorsAndWarnings.errors).toContainEqual({ message: 'error2' });
  });

  it('should reset errors and warnings', () => {
    errorsAndWarnings.shouldTrack = true;
    logger.warn('warn1');
    logger.error('error1');
    expect(errorsAndWarnings.shouldTrack).toBe(true);
    expect(errorsAndWarnings.warnings).toHaveLength(1);
    expect(errorsAndWarnings.warnings).toContainEqual({ message: 'warn1' });
    expect(errorsAndWarnings.errors).toHaveLength(1);
    expect(errorsAndWarnings.errors).toContainEqual({ message: 'error1' });
    errorsAndWarnings.reset();
    expect(errorsAndWarnings.errors).toHaveLength(0);
    expect(errorsAndWarnings.warnings).toHaveLength(0);
  });

  describe('#ignoreWarnings', () => {
    let messages: string[] = [];
    let logMock: any;
    beforeAll(() => {
      const m = Symbol.for('message');
      logMock = jest.fn();
      logMock.mockImplementation((log: any) => {
        if (log[m]) {
          messages.push(log[m]);
        }
      });
    });

    afterEach(() => {
      messages = [];
    });

    it('should ignore warnings which are listed directly', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        warn1
        `)
      );
      logger.warn('warn1');
      logger.error('error1');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/error.*error1/);
    });

    it('should ignore multiple warnings which are listed directly', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        warn1
        warn2
        `)
      );
      logger.warn('warn1');
      logger.warn('warn2');
      logger.error('error1');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/error.*error1/);
    });

    it('should ignore lines beginning with # when listing warnings', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        warn1
        # warn2
        `)
      );
      logger.warn('warn1');
      logger.warn('warn2');
      logger.error('error1');
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatch(/warn.*warn2/);
      expect(messages[1]).toMatch(/error.*error1/);
    });

    it('should ignore leading and trailing whitespace for warnings which are listed directly', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(' warn1  ');
      logger.warn('warn1');
      logger.error('error1');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/error.*error1/);
    });

    it('should not ignore warnings which are unlisted', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        warn1
        `)
      );
      logger.warn('warn1');
      logger.warn('warn2');
      logger.error('error1');
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatch(/warn.*warn2/);
      expect(messages[1]).toMatch(/error.*error1/);
    });

    it('should not ignore messages which are not warnings, even when listed', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        foo
        `)
      );
      logger.error('foo');
      logger.info('foo');
      logger.debug('foo');
      expect(messages).toHaveLength(3);
      expect(messages[0]).toMatch(/error.*foo/);
      expect(messages[1]).toMatch(/info.*foo/);
      expect(messages[2]).toMatch(/debug.*foo/);
    });

    it('should ignore warnings which are matched via regex', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        /ignore.*/
        `)
      );
      logger.warn('ignore this message');
      logger.warn(`ignore this message even though
      it goes over
      multiple lines`);
      expect(messages).toHaveLength(0);
    });

    it('should ignore warnings which are matched via regex with leading or trailing whitespace', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(' /ignore.*/ ');
      logger.warn('ignore this message');
      logger.warn(`ignore this message even though
      it goes over
      multiple lines`);
      expect(messages).toHaveLength(0);
    });

    it('should ignore warnings which are matched via regex and listed directly', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        /ignore.*/
        this too
        `)
      );
      logger.warn('ignore this message');
      logger.warn('this too');
      expect(messages).toHaveLength(0);
    });

    it('should not ignore warnings which do not match the regex', () => {
      logger.transports[0]['write'] = logMock;
      setIgnoredWarnings(
        leftAlign(`
        /ignore.*/
        `)
      );
      logger.warn('please log this');
      expect(messages).toHaveLength(1);
    });
  });
});
