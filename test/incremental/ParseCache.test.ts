import { FSHDocument, FSHImporter, RawFSH } from '../../src/import';
import { ParseCache } from '../../src/incremental/ParseCache';
import { PayloadStore } from '../../src/incremental/CacheStore';
import { encode, hashString } from '../../src/incremental/serialize';
import { definitionRegistry } from '../../src/incremental/registries';
import { loggerSpy } from '../testhelpers';

class MemoryStore implements PayloadStore {
  readonly payloads = new Map<string, string>();
  readFailures = 0;
  writeFailures = 0;

  putPayload(json: string): string {
    const ref = hashString(json);
    this.payloads.set(ref, json);
    return ref;
  }

  getPayload(ref: string): any {
    if (!this.payloads.has(ref)) {
      throw new Error('missing payload');
    }
    return JSON.parse(this.payloads.get(ref));
  }

  readFailed(): void {
    this.readFailures++;
  }

  writeFailed(): void {
    this.writeFailures++;
  }
}

const FILES: Record<string, string> = {
  'aliases.fsh': 'Alias: $sct = http://snomed.info/sct\nAlias: $unused = http://example.org\n',
  'rulesets.fsh': 'RuleSet: Flag(path)\n* {path} MS\n\nRuleSet: Plain\n* ^status = #active\n',
  'profile.fsh': 'Profile: MyPatient\nParent: Patient\n* insert Flag(name)\n* insert Plain\n',
  'vs.fsh': 'ValueSet: MyVS\n* $sct#123 "Something"\n',
  'cs.fsh': 'CodeSystem: MyCS\n* #a "A"\n',
  'warn.fsh': 'Profile: Warned\nParent: Patient\n* = = BAD\n'
};

describe('ParseCache', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  function rawFSH(files: Record<string, string>) {
    return Object.entries(files).map(([path, text]) => new RawFSH(text, path));
  }

  function encodeDocs(docs: FSHDocument[]) {
    return JSON.stringify(encode(docs, definitionRegistry()));
  }

  function logs() {
    return loggerSpy.getAllLogs().map(l => [l.level, l.message, l.file, l.location]);
  }

  function plain(files: Record<string, string>) {
    loggerSpy.reset();
    const docs = new FSHImporter().import(rawFSH(files));
    return { docs: encodeDocs(docs), logs: logs() };
  }

  function cached(files: Record<string, string>, cache: ParseCache) {
    loggerSpy.reset();
    const docs = new FSHImporter().import(rawFSH(files), cache);
    return { docs: encodeDocs(docs), logs: logs() };
  }

  function build(files: Record<string, string>, store: MemoryStore, old: ParseCache | null) {
    const cache = new ParseCache(store, old?.entries ?? null);
    const result = cached(files, cache);
    return { cache, result };
  }

  it('should import the same documents and logs as a normal import, without and with a cache', () => {
    const store = new MemoryStore();
    const expected = plain(FILES);
    // the syntax error produces an error, which must be reproduced
    expect(expected.logs.some(l => l[0] === 'error')).toBe(true);
    const first = build(FILES, store, null);
    expect(first.result).toEqual(expected);
    expect(first.cache.hits).toBe(0);
    const second = build(FILES, store, first.cache);
    expect(second.result).toEqual(expected);
    expect(second.cache.hits).toBe(Object.keys(FILES).length);
    expect(second.cache.misses).toBe(0);
  });

  it('should only import a changed file again', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const changed = { ...FILES, 'cs.fsh': 'CodeSystem: MyCS\n* #b "B"\n' };
    const second = build(changed, store, first.cache);
    expect(second.result).toEqual(plain(changed));
    expect(second.cache.misses).toBe(1);
  });

  it('should import files that use a changed alias again', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const changed = {
      ...FILES,
      'aliases.fsh': FILES['aliases.fsh'].replace('snomed.info', 'x.org')
    };
    const second = build(changed, store, first.cache);
    expect(second.result).toEqual(plain(changed));
    // aliases.fsh and vs.fsh, which uses $sct
    expect(second.cache.misses).toBe(2);
  });

  it('should import files that use a changed parameterized RuleSet again', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const changed = { ...FILES, 'rulesets.fsh': FILES['rulesets.fsh'].replace('MS', 'SU') };
    const second = build(changed, store, first.cache);
    expect(second.result).toEqual(plain(changed));
    expect(second.cache.misses).toBe(2);
  });

  it('should import files whose names became duplicates again', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const changed = { ...FILES, 'dup.fsh': 'ValueSet: MyVS\n* $sct#456 "Other"\n' };
    const second = build(changed, store, first.cache);
    expect(second.result).toEqual(plain(changed));
    expect(second.result.logs.some(l => /MyVS/.test(l[1]))).toBe(true);
  });

  it('should reproduce syntax errors, and recover when they are fixed', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const broken = { ...FILES, 'profile.fsh': FILES['profile.fsh'] + '* = = BROKEN\n' };
    const second = build(broken, store, first.cache);
    expect(second.result).toEqual(plain(broken));
    expect(second.result.logs.some(l => l[0] === 'error' && /File: profile\.fsh/.test(l[1]))).toBe(
      true
    );
    const third = build(broken, store, second.cache);
    expect(third.result).toEqual(plain(broken));
    const fixed = build(FILES, store, third.cache);
    expect(fixed.result).toEqual(plain(FILES));
  });

  it('should import normally when a cached entry is missing or malformed', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    const [first1, second1] = Object.values(first.cache.entries);
    store.payloads.delete(first1.ref);
    store.payloads.set(second1.ref, JSON.stringify({ doc: null }));
    const second = build(FILES, store, first.cache);
    expect(second.result).toEqual(plain(FILES));
    expect(second.cache.misses).toBe(2);
  });

  function rewriteEntry(
    store: MemoryStore,
    cache: ParseCache,
    file: string,
    change: (entry: any) => void
  ) {
    const ref = cache.entries[file].ref;
    const entry = JSON.parse(store.payloads.get(ref));
    change(entry);
    store.payloads.set(ref, JSON.stringify(entry));
  }

  it('should import normally when a cached document cannot be decoded', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    rewriteEntry(store, first.cache, 'cs.fsh', entry => (entry.doc = 5));
    const second = build(FILES, store, first.cache);
    expect(second.result).toEqual(plain(FILES));
    expect(second.cache.misses).toBe(1);
    expect(store.readFailures).toBe(1);
    expect(second.cache.errors[0]).toMatch(/not a FSHDocument/);
  });

  it('should import normally when what a cached import used cannot be checked', () => {
    const store = new MemoryStore();
    const first = build(FILES, store, null);
    rewriteEntry(store, first.cache, 'cs.fsh', entry => (entry.dependencies = [['unknown']]));
    rewriteEntry(store, first.cache, 'vs.fsh', entry => (entry.dependencies = [null]));
    const second = build(FILES, store, first.cache);
    expect(second.result).toEqual(plain(FILES));
    expect(second.cache.misses).toBe(2);
    // an unknown kind of dependency just doesn't hold, but one that can't be read is a failure
    expect(store.readFailures).toBe(1);
  });

  it('should not cache a file that logs a message it cannot copy', () => {
    const store = new MemoryStore();
    // the importer logs the error object for a filter with no value
    const files = {
      ...FILES,
      'filter.fsh':
        'ValueSet: FilteredVS\n* include codes from system http://x.org where concept is-a\n'
    };
    const first = build(files, store, null);
    expect(first.result).toEqual(plain(files));
    expect(first.cache.entries['filter.fsh']).toBeUndefined();
    expect(first.cache.skippedFiles).toEqual([
      'did not cache the import of filter.fsh, as a message it logs could not be copied'
    ]);
    const second = build(files, store, first.cache);
    expect(second.result).toEqual(plain(files));
    expect(second.cache.misses).toBe(1);
  });

  it('should not cache a file whose import ran out of stack space', () => {
    const store = new MemoryStore();
    // what is logged when the stack runs out depends on how deep the stack already was
    const files = {
      ...FILES,
      'recursive.fsh':
        'RuleSet: Again(p)\n* name.given = "{p}"\n* insert Again(q)\n\nProfile: Deep\nParent: Patient\n* insert Again(w)\n'
    };
    const first = build(files, store, null);
    expect(first.result.logs.some(l => /Maximum call stack size exceeded/.test(l[1]))).toBe(true);
    expect(first.cache.entries['recursive.fsh']).toBeUndefined();
    expect(first.cache.skippedFiles).toEqual([
      'did not cache the import of recursive.fsh, as importing it caught a RangeError'
    ]);
    const second = build(files, store, first.cache);
    expect(second.cache.misses).toBe(1);
  });
});
