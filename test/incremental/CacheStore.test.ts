import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import temp from 'temp';
import { CACHE_FORMAT, CacheStore } from '../../src/incremental/CacheStore';

describe('CacheStore', () => {
  let dir: string;
  let store: CacheStore;

  beforeAll(() => {
    temp.track();
  });

  beforeEach(() => {
    dir = path.join(temp.mkdirSync('sushi-test'), 'cache');
    store = new CacheStore(dir);
    store.open();
  });

  afterAll(() => {
    temp.cleanupSync();
  });

  it('should create the cache directory, ignored by git', () => {
    expect(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')).toMatch(/^\*$/m);
  });

  it('should store and read back payloads by their hash', () => {
    const ref = store.putPayload('{"a":1}');
    expect(store.putPayload('{"a":1}')).toBe(ref);
    expect(store.getPayload(ref)).toEqual({ a: 1 });
    // a new store sees the payloads that are already on disk
    const other = new CacheStore(dir);
    other.open();
    expect(other.getPayload(ref)).toEqual({ a: 1 });
  });

  it('should refuse a payload whose content does not match its hash', () => {
    const ref = store.putPayload('{"a":1}');
    fs.writeFileSync(path.join(dir, 'p', `${ref}.json.gz`), zlib.gzipSync('{"a":2}'));
    expect(() => store.getPayload(ref)).toThrow(/Corrupt/);
    // the corrupt file is removed, and written again when the payload is stored
    expect(fs.existsSync(path.join(dir, 'p', `${ref}.json.gz`))).toBe(false);
    expect(store.putPayload('{"a":1}')).toBe(ref);
    expect(store.getPayload(ref)).toEqual({ a: 1 });
  });

  it('should refuse a payload that is not gzipped or missing', () => {
    const ref = store.putPayload('{"a":1}');
    fs.writeFileSync(path.join(dir, 'p', `${ref}.json.gz`), '{"a":1}');
    expect(() => store.getPayload(ref)).toThrow();
    expect(() => store.getPayload('nothere')).toThrow();
    expect(() => store.getPayload('../manifest')).toThrow(/Invalid/);
  });

  it('should read back the manifest it wrote', () => {
    expect(store.readManifest()).toBeNull();
    const manifest = { format: CACHE_FORMAT, globalKey: 'g', parseKey: 'p', parse: { x: 1 } };
    store.writeManifest(manifest);
    expect(store.readManifest()).toEqual(manifest);
  });

  it('should ignore a manifest of another format, or one that cannot be read', () => {
    store.writeManifest({ format: CACHE_FORMAT + 1, globalKey: 'g', parseKey: 'p' });
    expect(store.readManifest()).toBeNull();
    expect(store.manifestProblem).toMatch(/different version/);
    fs.writeFileSync(path.join(dir, 'manifest.json.gz'), zlib.gzipSync('{not json'));
    expect(store.readManifest()).toBeNull();
    expect(store.manifestProblem).toMatch(/could not be read/);
    fs.writeFileSync(path.join(dir, 'manifest.json.gz'), 'garbage');
    expect(store.readManifest()).toBeNull();
  });

  it('should delete only the payloads that are not referenced', () => {
    const keep = store.putPayload('"keep"');
    const drop = store.putPayload('"drop"');
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    fs.utimesSync(path.join(dir, 'p', `${drop}.json.gz`), old, old);
    fs.writeFileSync(path.join(dir, 'p', 'leftover.tmp'), '');
    fs.utimesSync(path.join(dir, 'p', 'leftover.tmp'), old, old);
    store.collectGarbage(new Set([keep]));
    expect(fs.readdirSync(path.join(dir, 'p'))).toEqual([`${keep}.json.gz`]);
    // a payload that was collected is written again when needed
    expect(store.putPayload('"drop"')).toBe(drop);
    expect(store.getPayload(drop)).toBe('drop');
  });

  it('should keep files that another build may be using', () => {
    const hours = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);
    fs.writeFileSync(path.join(dir, 'p', 'unused.json.gz'), zlib.gzipSync('"unused"'));
    fs.utimesSync(path.join(dir, 'p', 'unused.json.gz'), hours(2), hours(2));
    // used by another build half an hour ago
    fs.writeFileSync(path.join(dir, 'p', 'recent.json.gz'), zlib.gzipSync('"recent"'));
    fs.utimesSync(path.join(dir, 'p', 'recent.json.gz'), hours(0.5), hours(0.5));
    const later = new CacheStore(dir);
    later.open();
    // written after this build started, by another build
    fs.writeFileSync(path.join(dir, 'p', 'other.json.gz'), zlib.gzipSync('"other"'));
    fs.writeFileSync(path.join(dir, 'p', 'x.json.gz.123.abc.tmp'), '');
    later.collectGarbage(new Set());
    expect(fs.readdirSync(path.join(dir, 'p')).sort()).toEqual([
      'other.json.gz',
      'recent.json.gz',
      'x.json.gz.123.abc.tmp'
    ]);
  });

  it('should mark the payloads it uses as recently used', () => {
    const ref = store.putPayload('"used"');
    const file = path.join(dir, 'p', `${ref}.json.gz`);
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(file, old, old);
    store.getPayload(ref);
    expect(fs.statSync(file).mtimeMs).toBeGreaterThan(Date.now() - 60 * 1000);
  });

  it('should only remove payloads whose content is corrupt', () => {
    const ref = store.putPayload('{"a":1}');
    const file = path.join(dir, 'p', `${ref}.json.gz`);
    // a file that cannot be read is not known to be corrupt
    fs.unlinkSync(file);
    fs.mkdirSync(file);
    expect(() => store.getPayload(ref)).toThrow();
    expect(fs.existsSync(file)).toBe(true);
    expect(store.corruptPayloads).toBe(0);
    fs.rmdirSync(file);
    fs.writeFileSync(file, zlib.gzipSync('{"a":'));
    expect(() => store.getPayload(ref)).toThrow();
    expect(fs.existsSync(file)).toBe(false);
    expect(store.corruptPayloads).toBe(1);
  });

  it('should write a payload again when it went missing during the build', () => {
    const ref = store.putPayload('{"a":1}');
    const file = path.join(dir, 'p', `${ref}.json.gz`);
    fs.unlinkSync(file);
    expect(store.putPayload('{"a":1}')).toBe(ref);
    expect(fs.existsSync(file)).toBe(true);
    fs.unlinkSync(file);
    expect(() => store.getPayload(ref)).toThrow();
    expect(store.putPayload('{"a":1}')).toBe(ref);
    expect(store.getPayload(ref)).toEqual({ a: 1 });
  });

  it('should count only the corrupt payloads it could remove', () => {
    const ref = store.putPayload('{"a":1}');
    const file = path.join(dir, 'p', `${ref}.json.gz`);
    fs.writeFileSync(file, zlib.gzipSync('{"a":'));
    const spy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw Object.assign(new Error('not allowed'), { code: 'EPERM' });
    });
    try {
      expect(() => store.getPayload(ref)).toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(store.corruptPayloads).toBe(0);
    expect(store.cleanupError).toBe('not allowed');
  });

  it('should note a cache directory it cannot list', () => {
    fs.rmSync(path.join(dir, 'p'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'p'), '');
    store.collectGarbage(new Set());
    expect(store.cleanupError).toMatch(/ENOTDIR/);
  });

  it('should note unexpected failures to clean up', () => {
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    // a file that is already gone is not a failure
    const gone = store.putPayload('"gone"');
    fs.unlinkSync(path.join(dir, 'p', `${gone}.json.gz`));
    store.collectGarbage(new Set());
    expect(store.cleanupError).toBeNull();
    // but one that cannot be removed is
    const stuck = path.join(dir, 'p', 'stuck.json.gz');
    fs.mkdirSync(stuck);
    fs.utimesSync(stuck, old, old);
    store.collectGarbage(new Set());
    expect(store.cleanupError).not.toBeNull();
  });

  it('should note payloads it cannot write', () => {
    fs.rmSync(path.join(dir, 'p'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'p'), '');
    expect(() => store.putPayload('{"a":1}')).toThrow(/ENOTDIR|ENOENT/);
    expect(store.writeError).toMatch(/ENOTDIR|ENOENT/);
  });

  it('should note a manifest it cannot write, leaving no temporary file', () => {
    fs.mkdirSync(path.join(dir, 'manifest.json.gz'));
    expect(() =>
      store.writeManifest({ format: CACHE_FORMAT, globalKey: 'g', parseKey: 'p', parse: {} })
    ).toThrow();
    expect(store.writeError).not.toBeNull();
    expect(fs.readdirSync(dir).filter(f => f.endsWith('.tmp'))).toEqual([]);
  });
});
