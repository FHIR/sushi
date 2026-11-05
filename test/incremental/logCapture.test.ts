import { captureLogs, copyLogInfo, emitLogInfo, holdLogs } from '../../src/incremental/logCapture';
import { logger, restoreMainLogger, switchToSecretLogger } from '../../src/utils/FSHLogger';
import { loggerSpy } from '../testhelpers';

describe('logCapture', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#copyLogInfo', () => {
    it('should copy a log entry as plain data, without undefined values', () => {
      expect(copyLogInfo({ level: 'warn', message: 'm', file: 'a.fsh', extra: undefined })).toEqual(
        { level: 'warn', message: 'm', file: 'a.fsh' }
      );
    });

    it('should not copy an entry without a string message or level', () => {
      expect(copyLogInfo(null)).toBeNull();
      expect(copyLogInfo({ level: 'error', message: new Error('e') })).toBeNull();
      expect(copyLogInfo({ message: 'm' })).toBeNull();
      const error: any = new Error('not enumerable');
      error.level = 'error';
      expect(copyLogInfo(error)).toBeNull();
    });

    it('should not copy an entry that is not plain data', () => {
      const circular: any = { level: 'error', message: 'm' };
      circular.self = circular;
      expect(copyLogInfo(circular)).toBeNull();
    });
  });

  describe('#captureLogs', () => {
    it('should return the result, and copies of the entries written', () => {
      const { result, logs } = captureLogs(() => {
        logger.warn('first');
        logger.error('second', { file: 'a.fsh' });
        return 42;
      }, false);
      expect(result).toBe(42);
      expect(logs.map(l => [l.level, l.message, l.file])).toEqual([
        ['warn', 'first', undefined],
        ['error', 'second', 'a.fsh']
      ]);
      expect(loggerSpy.getAllLogs()).toHaveLength(2);
    });

    it('should not write the entries when muted, and write them again later', () => {
      const { logs } = captureLogs(() => logger.warn('muted'), true);
      expect(loggerSpy.getAllMessages()).toEqual([]);
      logs.forEach(emitLogInfo);
      expect(loggerSpy.getAllLogs().map(l => [l.level, l.message])).toEqual([['warn', 'muted']]);
    });

    it('should give no logs if an entry cannot be copied, but still write it', () => {
      const { logs } = captureLogs(() => {
        logger.error(new Error('as an object') as any);
        logger.warn('after');
      }, false);
      expect(logs).toBeNull();
      expect(loggerSpy.getAllLogs()).toHaveLength(2);
    });

    it('should pass entries for the secret logger straight through', () => {
      const { logs } = captureLogs(() => {
        const saved = switchToSecretLogger();
        // set aside while collecting, so it does not add to the stack
        expect(Object.getOwnPropertyDescriptor(logger, 'write')).toBeUndefined();
        logger.error('collected');
        const collected = restoreMainLogger(saved);
        expect(collected.errors.map(e => e.message)).toEqual(['collected']);
        logger.warn('after');
      }, true);
      expect(logs.map(l => l.message)).toEqual(['after']);
    });

    it('should restore the logger, also when captures are nested or fn throws', () => {
      const write = logger.write;
      const outer = captureLogs(() => {
        captureLogs(() => logger.warn('inner'), true);
        logger.warn('outer');
        expect(() =>
          captureLogs(() => {
            throw new Error('boom');
          }, false)
        ).toThrow('boom');
        logger.warn('still captured');
      }, true);
      expect(outer.logs.map(l => l.message)).toEqual(['outer', 'still captured']);
      expect(logger.write).toBe(write);
      expect(Object.getOwnPropertyDescriptor(logger, 'write')).toBeUndefined();
    });
  });

  describe('#holdLogs', () => {
    it('should hold entries until released, then write them or drop them', () => {
      const held = holdLogs();
      logger.warn('kept');
      expect(loggerSpy.getAllLogs()).toHaveLength(0);
      held.release(true);
      held.release(true);
      expect(loggerSpy.getAllLogs().map(l => l.message)).toEqual(['kept']);

      const dropped = holdLogs();
      logger.warn('dropped');
      dropped.release(false);
      expect(loggerSpy.getAllLogs()).toHaveLength(1);
    });

    it('should pass entries for the secret logger straight through', () => {
      const held = holdLogs();
      const saved = switchToSecretLogger();
      logger.error('collected');
      const collected = restoreMainLogger(saved);
      held.release(false);
      expect(collected.errors.map(e => e.message)).toEqual(['collected']);
    });

    it('should restore a capture it was nested in', () => {
      const write = logger.write;
      const { logs } = captureLogs(() => {
        const held = holdLogs();
        logger.warn('inner');
        held.release(true);
        logger.warn('outer');
      }, true);
      expect(logs.map(l => l.message)).toEqual(['inner', 'outer']);
      expect(logger.write).toBe(write);
    });
  });
});
