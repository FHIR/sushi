import { FSHDocument, ImportCache, CachedImport } from '../import';
import { captureLogs, emitLogInfo } from './logCapture';
import { decode, encode, hashString, hashValue } from './serialize';
import { definitionRegistry } from './registries';
import { PayloadStore } from './CacheStore';

export type ParseState = Record<string, { hash: string; ref: string }>;

/**
 * The cache of imported FSH files. Each file's entry is found by its path and the hash of its
 * content, and holds what importing it produced (see FSHImporter.importWithCache).
 */
export class ParseCache implements ImportCache {
  readonly entries: ParseState = {};
  /** The number of files whose cached import was reused */
  hits = 0;
  /** The number of files that were imported again */
  get misses(): number {
    return this.looked - this.hits;
  }
  private looked = 0;

  constructor(
    private readonly payloads: PayloadStore,
    private readonly old: ParseState | null
  ) {}

  lookup(file: string, content: string): CachedImport | null {
    this.looked++;
    const old = this.old?.[file];
    if (old == null || old.hash !== hashString(content)) {
      return null;
    }
    try {
      const entry = this.payloads.getPayload(old.ref);
      if (
        !Array.isArray(entry?.parseLogs) ||
        !Array.isArray(entry.items) ||
        !Array.isArray(entry.dependencies) ||
        !Array.isArray(entry.visitLogs) ||
        entry.doc == null
      ) {
        this.failed(`reading the cached import of ${file}`, new Error('unexpected content'));
        return null;
      }
      return entry;
    } catch (e) {
      this.failed(`reading the cached import of ${file}`, e);
      return null;
    }
  }

  /** Unexpected errors, with their stacks, for debugging */
  readonly errors: string[] = [];
  /** Why some files were not cached, for debugging */
  readonly skippedFiles: string[] = [];

  skipped(file: string, why: string) {
    this.skippedFiles.push(`did not cache the import of ${file}, as ${why}`);
  }

  /** Keeps an unexpected error, and counts it as a failure to read or write the cache. */
  failed(during: string, e: any, writing = false) {
    this.errors.push(`while ${during}: ${e?.stack ?? e}`);
    if (writing) {
      this.payloads.writeFailed(e);
    } else {
      this.payloads.readFailed(e);
    }
  }

  keep(file: string): void {
    this.hits++;
    this.entries[file] = this.old[file];
  }

  store(file: string, content: string, entry: CachedImport): void {
    try {
      const ref = this.payloads.putPayload(JSON.stringify(entry));
      this.entries[file] = { hash: hashString(content), ref };
    } catch (e) {
      // not cached; the file will just be imported again next time
      this.failed(`storing the import of ${file}`, e, true);
    }
  }

  capture<T>(fn: () => T, mute: boolean): { result: T; logs: any[] | null } {
    return captureLogs(fn, mute);
  }

  emit(logs: any[]): void {
    logs.forEach(emitLogInfo);
  }

  hash(value: any): string {
    return hashValue(value, definitionRegistry());
  }

  encodeDoc(doc: FSHDocument): any {
    return encode(doc, definitionRegistry());
  }

  decodeDoc(encoded: any): FSHDocument | null {
    try {
      const doc = decode(encoded, definitionRegistry());
      if (!(doc instanceof FSHDocument)) {
        throw new Error('the cached document is not a FSHDocument');
      }
      return doc;
    } catch (e) {
      // the file is imported again
      this.failed('decoding a cached import', e);
      return null;
    }
  }
}
