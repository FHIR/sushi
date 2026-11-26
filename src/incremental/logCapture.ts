import { logger } from '../utils/FSHLogger';

const LEVEL = Symbol.for('level');

/**
 * Copies a log entry as plain data, so it can be stored and written again later with the same
 * result. Returns null if the entry is not plain data.
 */
export function copyLogInfo(info: any): any {
  // An Error logged as the entry itself would lose its message, which is not enumerable
  if (
    info == null ||
    Object.getPrototypeOf(info) !== Object.prototype ||
    typeof info.message !== 'string' ||
    typeof info.level !== 'string'
  ) {
    return null;
  }
  const copy: any = {};
  for (const key of Object.keys(info)) {
    if (info[key] !== undefined) {
      copy[key] = info[key];
    }
  }
  try {
    return JSON.parse(JSON.stringify(copy));
  } catch {
    return null;
  }
}

/** Writes a copied log entry again, through the logger's formats (counting, ignoring, printing). */
export function emitLogInfo(copy: any): void {
  logger.write({ ...copy, [LEVEL]: copy.level });
}

/**
 * Runs fn and returns copies of the log entries it wrote, or null for logs if any entry could not
 * be copied. With mute, the entries are not written at all. Entries written while the importer
 * collects messages from a generated document are not seen, as the secret logger sets this aside.
 */
export function captureLogs<T>(fn: () => T, mute: boolean): { result: T; logs: any[] | null } {
  const ownWrite = Object.getOwnPropertyDescriptor(logger, 'write');
  const write = logger.write;
  let logs: any[] = [];
  Object.defineProperty(logger, 'write', {
    value: function (info: any, ...rest: any[]) {
      if (logs != null) {
        const copy = copyLogInfo(info);
        if (copy == null) {
          logs = null;
        } else {
          logs.push(copy);
        }
      }
      return mute ? true : write.call(logger, info, ...rest);
    },
    configurable: true,
    writable: true
  });
  try {
    return { result: fn(), logs };
  } finally {
    if (ownWrite != null) {
      Object.defineProperty(logger, 'write', ownWrite);
    } else {
      delete (logger as any).write;
    }
  }
}

/**
 * Holds back everything written to the logger until release is called, then writes it (in order)
 * or drops it. Entries written while the importer collects messages from a generated document are
 * not seen, as the secret logger sets this aside.
 */
export function holdLogs(): { release(write: boolean): void } {
  const ownWrite = Object.getOwnPropertyDescriptor(logger, 'write');
  const write = logger.write;
  const held: any[][] = [];
  Object.defineProperty(logger, 'write', {
    value: function (info: any, ...rest: any[]) {
      held.push([info, ...rest]);
      return true;
    },
    configurable: true,
    writable: true
  });
  let released = false;
  return {
    release(writeHeld: boolean) {
      if (released) {
        return;
      }
      released = true;
      if (ownWrite != null) {
        Object.defineProperty(logger, 'write', ownWrite);
      } else {
        delete (logger as any).write;
      }
      if (writeHeld) {
        held.forEach(args => write.call(logger, ...args));
      }
    }
  };
}
