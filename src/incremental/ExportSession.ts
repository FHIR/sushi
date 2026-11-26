import cloneDeep from 'lodash/cloneDeep';
import { logger } from '../utils/FSHLogger';
import { Type } from '../utils/Fishable';
import { StructureDefinition } from '../fhirtypes/StructureDefinition';
import { InstanceExporter } from '../export/InstanceExporter';
import { getUrlFromFshDefinition, getVersionFromFshDefinition } from '../fhirtypes/common';
import { getNonInstanceValueFromRules } from '../fshtypes/common';
import { AssignmentRule } from '../fshtypes/rules';
import { FshCode } from '../fshtypes/FshCode';
import { IncrementalSessionHooks } from './hooks';
import { PayloadStore } from './CacheStore';
import { copyLogInfo, emitLogInfo } from './logCapture';
import {
  ClassRegistry,
  UnserializableError,
  decode,
  encode,
  hashString,
  replaceOwnProperties
} from './serialize';
import { definitionRegistry, packageRegistry } from './registries';

/**
 * An ExportSession records how each FSH entity (Profile, Extension, Logical, Resource, Instance,
 * ValueSet, CodeSystem) was exported: every log message it wrote, every lookup it made into the
 * package and the tank (and what those lookups found), every nested export it triggered, and the
 * resulting FHIR object. On the next build, an entity whose definition is unchanged and whose
 * lookups would all find the same things can be "replayed": its log messages are re-emitted, its
 * nested exports are re-triggered in the same order, and a copy of its recorded FHIR object is
 * added to the package, all without running the exporter.
 *
 * The rules are conservative. Anything the session cannot account for marks the entity as
 * non-reusable, so it is exported normally on the next build. If, during a build, something
 * happens that the session did not predict, it aborts, and the caller redoes the whole export
 * from scratch without replaying anything.
 */

type EntityKind = 'sd' | 'vs' | 'cs' | 'inst' | 'other';
type State = 'p' | 'i' | 'd' | 'n';

// Script events. See the Frame class for how each is recorded and ExportSession.replay for how
// each is replayed.
export type ScriptEvent =
  | ['L', any] // a log message
  | ['P', string] // the entity's FHIR object was added to the named package array
  | ['M', string, any] // an entry was added to the package's fshMap
  | ['C'] // the duplicate id check ran (it is always re-run, never replayed)
  | ['T', string, string, boolean, string[]] // nested export: key, exporter, threw, all keys exported
  | ['R', any, string[], string[]] // package lookup: item, types, keys of all matches
  | ['Q', string, any, string[], string[], State[], string?] // tank lookup
  | ['A', string, string | null] // alias lookup: name, value
  | ['S', string, boolean, string, string]; // sdCache use: url, created, fp at use, fp at end

export interface FrameRecord {
  kind: EntityKind;
  ok: boolean;
  why?: string;
  pre: string;
  script: ScriptEvent[];
  deps: Record<string, string>;
  vis: string | null;
  afterHash: string | null;
  afterRef?: string;
  payloadRef?: string;
  arr?: string;
  sdProps?: string;
  threw: boolean;
  nulls?: any[];
}

export interface ExportState {
  records: Record<string, FrameRecord>;
  unstable?: boolean;
}

export interface ExportStats {
  exported: number;
  replayed: number;
  aborted: boolean;
  abortReason?: string;
  reasons: Record<string, number>;
  /** Why each entity was exported rather than replayed */
  exportedBecause: Record<string, string>;
  /** Unexpected errors in the session's own bookkeeping, with their stacks */
  errors: string[];
}

const PKG_ARRAYS = [
  'profiles',
  'extensions',
  'logicals',
  'resources',
  'instances',
  'valueSets',
  'codeSystems'
];
const FRAME_KINDS: Record<string, EntityKind> = {
  Profile: 'sd',
  Extension: 'sd',
  Logical: 'sd',
  Resource: 'sd',
  Instance: 'inst',
  FshValueSet: 'vs',
  FshCodeSystem: 'cs'
};
const SD_PROPS = [
  'resourceType',
  'id',
  'name',
  'title',
  'description',
  'version',
  'url',
  'type',
  'kind',
  'derivation',
  'baseDefinition',
  'abstract',
  'inProgress'
];

class AbortedError extends Error {}

class Frame {
  script: ScriptEvent[] = [];
  ok = true;
  why: string;
  subtree: string[] = [];
  segment = new Set<string>();
  aliases = new Set<string>();
  deps = new Map<string, string>();
  pushed: { arr: string; obj: any }[] = [];
  created: any[] = [];
  sdTouches: { entry: any; event: any[] }[] = [];

  constructor(
    public readonly key: string,
    public readonly kind: EntityKind,
    public readonly def: any,
    public readonly exporter: any,
    public readonly mode: 'record' | 'replay'
  ) {}

  fail(why: string) {
    if (this.ok) {
      this.ok = false;
      this.why = why;
    }
  }
}

/**
 * Whether replaying an sdCache use leaves the cache behind what the export would have made it. A
 * newly created entry that was not changed is the same as the one the next export using it will
 * create; any other use may have changed the entry in ways its fingerprint does not show.
 */
function leavesBehind(ev: ScriptEvent): boolean {
  return !(ev[0] === 'S' && ev[2] && ev[3] === ev[4]);
}

export function sdFingerprint(sd: any): string {
  const elements: any[] = sd?.elements ?? [];
  let s = `${elements.length}`;
  for (const e of elements) {
    s += `\n${e?.id}:${e == null ? 0 : Object.keys(e).length}`;
  }
  return hashString(s);
}

function sameSequence(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export class ExportSession implements IncrementalSessionHooks {
  private ctx: any;
  private phase: 'idle' | 'main' | 'post' | 'done' = 'idle';
  private readonly defRegistry: ClassRegistry = definitionRegistry();
  private readonly pkgRegistry: ClassRegistry = packageRegistry();
  private readonly oldRecords: Map<string, FrameRecord>;
  readonly records = new Map<string, FrameRecord>();

  private keyToDef = new Map<string, any>();
  private defToKey = new Map<any, string>();
  private kindOfKey = new Map<string, EntityKind>();
  private preHash = new Map<string, string | null>();
  private beginSigs = new Map<string, string>();
  private objKey = new WeakMap<any, string>();
  private status = new Map<string, 'i' | 'd'>();
  private frameCount = new Map<string, number>();
  private replayed = new Set<string>();
  private liveVis = new Map<string, string | null>();
  private liveAfter = new Map<string, string | null>();
  private liveObjects = new Map<string, { obj: any; payloadHash: string }>();
  private standIns = new Map<string, any>();
  private postReads = new Set<string>();
  private probeMemo = new Map<string, string>();
  // What each InstanceExporter's sdCache would hold if replayed exports had really run. The
  // cached StructureDefinitions are changed (unfolded) by the exports that use them, and replaying
  // an export does not do that, so the cache can fall behind. A replay is allowed only when the
  // cache is as it was when the export was recorded, and an export that runs cannot use an entry
  // that has fallen behind (the session aborts if that happens).
  private cacheViews = new Map<any, Map<string, { fp: string; behind: boolean; by: string }>>();
  // sdCache entries (of the main InstanceExporter) that exports expected to run will use. Replays
  // that would change these entries are not allowed, so the entries never fall behind.
  private pinnedUrls = new Set<string>();
  private stack: Frame[] = [];
  private tankDepth = 0;
  private outerTankMethod: string = null;
  private stash: any = undefined;
  private suppress = 0;
  private inCheck = 0;
  private buffer: any[] = [];
  private buffering = false;
  private origWrite: any = null;
  private restorers: (() => void)[] = [];
  private replayEnabled: boolean;
  private readonly canAbort: boolean;
  unstable = false;
  saveable = true;
  aborted = false;
  abortReason: string;
  readonly reasons: Record<string, number> = {};
  /** Why exports from the previous build could not be replayed at all, if they could not */
  readonly notes: string[] = [];
  readonly errors: string[] = [];
  private untracked = 0;
  /** Whether any record of the previous build was looked at */
  consultedOld = false;

  constructor(
    private readonly store: PayloadStore,
    old: ExportState | null
  ) {
    this.oldRecords = new Map(Object.entries(old?.records ?? {}));
    this.replayEnabled = old != null && !old.unstable;
    this.canAbort = this.replayEnabled;
    if (old?.unstable) {
      this.notes.push(
        'exports were not reused, as a definition changed unexpectedly during the previous build'
      );
    }
  }

  /** Whether anything may be replayed, so the export may have to be redone */
  get mayReplay(): boolean {
    return this.started && this.canAbort && this.replayEnabled;
  }

  // Whether the export has begun, so that something may have been replayed
  private started = false;

  get stats(): ExportStats {
    return {
      exported: this.status.size + this.untracked,
      replayed: this.replayed.size,
      aborted: this.aborted,
      abortReason: this.abortReason,
      reasons: this.reasons,
      exportedBecause: Object.fromEntries(this.exportedBecause),
      errors: this.errors
    };
  }

  private lastReason: string;
  private readonly exportedBecause = new Map<string, string>();

  getState(): ExportState {
    const records: Record<string, FrameRecord> = {};
    this.records.forEach((rec, key) => (records[key] = rec));
    return { records, unstable: this.unstable };
  }

  // ----------------------------------------------------------------------------------------
  // Setup and teardown
  // ----------------------------------------------------------------------------------------

  beginExport(ctx: any): void {
    this.ctx = ctx;
    this.phase = 'main';
    this.started = true;
    // The logger goes first, so the lookups made while preparing can be kept quiet
    this.installLogger();
    try {
      this.indexTank();
      if (this.replayEnabled) {
        this.suppress++;
        try {
          this.pinSdCacheEntries();
        } finally {
          this.suppress--;
        }
      }
    } catch (e) {
      // Nothing has been exported yet, so just export everything and keep no record of it
      if (this.replayEnabled) {
        this.notes.push('exports were not reused, as the export could not be prepared');
      }
      this.replayEnabled = false;
      this.saveable = false;
      this.abortReason = `could not prepare the export (${e?.message})`;
      this.keepError('preparing the export', e);
    }
    this.installPackageHooks();
    this.installTankHooks();
  }

  private indexTank() {
    const tank = this.ctx.tank;
    const entities = [
      ...tank.getAllStructureDefinitions(),
      ...tank.getAllInstances(),
      ...tank.getAllValueSets(),
      ...tank.getAllCodeSystems(),
      ...tank.getAllInvariants(),
      ...tank.getAllRuleSets(),
      ...tank.getAllMappings()
    ];
    const add = (key: string, def: any, kind: EntityKind) => {
      if (this.keyToDef.has(key) || this.defToKey.has(def)) {
        // Two entities with the same key cannot be told apart, so nothing can be reused safely
        if (this.replayEnabled) {
          this.notes.push(`exports were not reused, as there are two definitions of ${key}`);
        }
        this.replayEnabled = false;
        this.saveable = false;
        this.abortReason = this.abortReason ?? `there are two definitions of ${key}`;
        return;
      }
      this.keyToDef.set(key, def);
      this.defToKey.set(def, key);
      this.kindOfKey.set(key, kind);
      this.preHash.set(key, this.hashDef(def));
      if (kind !== 'other') {
        this.beginSigs.set(key, this.fishSignature(def));
      }
    };
    for (const def of entities) {
      add(`${def.constructorName}:${def.name}`, def, FRAME_KINDS[def.constructorName] ?? 'other');
    }
    for (const doc of tank.docs) {
      doc.appliedRuleSets.forEach((ruleSet: any, id: string) => {
        const key = `AppliedRuleSet:${id}`;
        if (!this.keyToDef.has(key)) {
          add(key, ruleSet, 'other');
        }
      });
    }
  }

  /**
   * Finds the sdCache entries that Instances which may be exported (not replayed) use, so replays
   * never leave those entries behind. Only uses what is known before exporting anything: an entity
   * may be exported if it or something it used changed, or if it changes a pinned entry, since its
   * replay is then refused.
   */
  private pinSdCacheEntries() {
    const mayExport = new Set<string>();
    const pinFrom = (key: string, def: any) => {
      if (this.oldRecords.has(key)) {
        this.consultedOld = true;
      }
      for (const ev of this.oldRecords.get(key)?.script ?? []) {
        if (ev[0] === 'S') {
          this.pinnedUrls.add(ev[1]);
        }
      }
      if (this.kindOfKey.get(key) !== 'inst') {
        return;
      }
      try {
        const url = this.ctx.fisher.fishForMetadata(
          def.instanceOf,
          Type.Resource,
          Type.Profile,
          Type.Extension,
          Type.Type,
          Type.Logical
        )?.url;
        if (url != null) {
          this.pinnedUrls.add(url);
        }
      } catch (e) {
        // Which entries this Instance will use is unknown, so no replay can be trusted not to
        // change them
        if (this.replayEnabled) {
          this.notes.push(
            `exports were not reused, as looking up ${def.instanceOf} failed (${e?.message})`
          );
        }
        this.replayEnabled = false;
        this.keepError(`looking up ${def.instanceOf}`, e);
      }
    };
    this.keyToDef.forEach((def, key) => {
      if (this.kindOfKey.get(key) !== 'other' && !this.staticallyReusable(key)) {
        mayExport.add(key);
        pinFrom(key, def);
      }
    });
    const usesAny = (rec: FrameRecord) =>
      rec.script.some(ev => {
        switch (ev[0]) {
          case 'R':
            return ev[3].some(k => mayExport.has(k));
          case 'Q':
            return ev[4].some(k => mayExport.has(k));
          case 'T':
            return mayExport.has(ev[1]) || ev[4].some(k => mayExport.has(k));
          case 'S':
            return leavesBehind(ev) && this.pinnedUrls.has(ev[1]);
          default:
            return false;
        }
      });
    let grew = true;
    while (grew) {
      grew = false;
      this.keyToDef.forEach((def, key) => {
        const rec = this.oldRecords.get(key);
        if (rec != null && !mayExport.has(key) && usesAny(rec)) {
          mayExport.add(key);
          pinFrom(key, def);
          grew = true;
        }
      });
    }
  }

  private staticallyReusable(key: string): boolean {
    const old = this.oldRecords.get(key);
    const pre = this.preHash.get(key);
    if (old != null) {
      this.consultedOld = true;
    }
    if (old == null || !old.ok || old.kind !== this.kindOfKey.get(key) || pre == null) {
      return false;
    }
    if (pre !== old.pre) {
      return false;
    }
    if (Object.entries(old.deps).some(([dep, hash]) => this.preHash.get(dep) !== hash)) {
      return false;
    }
    return old.script.every(ev => (ev[0] === 'A' || ev[0] === 'Q' ? this.probe(ev) : true));
  }

  private hashDef(def: any): string | null {
    try {
      return hashString(JSON.stringify(encode(def, this.defRegistry)));
    } catch (e) {
      if (e instanceof UnserializableError) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Everything about a definition that decides which lookups in the tank find it, and what
   * metadata the tank reports for it. Lookups are checked against the tank as it is at the start
   * of the export, so this must not change while exporting.
   */
  private fishSignature(def: any): string {
    const tank = this.ctx.tank;
    const sig: any[] = [
      def.name,
      def.id,
      getUrlFromFshDefinition(def, tank.config.canonical),
      getVersionFromFshDefinition(def, tank.config.version),
      tank.extractMetadataFromEntity(def)
    ];
    if (def.constructorName !== 'Instance') {
      if (def.constructorName === 'FshValueSet' || def.constructorName === 'FshCodeSystem') {
        sig.push(getNonInstanceValueFromRules(def, 'name', '', 'name'));
      }
    } else {
      sig.push(def.instanceOf, def.usage, getNonInstanceValueFromRules(def, 'name', '', 'name'));
      for (const rule of def.rules) {
        if (rule instanceof AssignmentRule && ['derivation', 'kind', 'type'].includes(rule.path)) {
          sig.push([rule.path, rule.value instanceof FshCode ? `#${rule.value.code}` : rule.value]);
        }
      }
    }
    return JSON.stringify(sig);
  }

  private installLogger() {
    this.origWrite = logger.write;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    const write = function (info: any, ...rest: any[]) {
      return session.onLog(info, rest);
    };
    Object.defineProperty(logger, 'write', { value: write, configurable: true, writable: true });
    this.buffering = true;
    this.restorers.push(() => {
      delete (logger as any).write;
      if (logger.write !== this.origWrite) {
        Object.defineProperty(logger, 'write', {
          value: this.origWrite,
          configurable: true,
          writable: true
        });
      }
    });
  }

  private installPackageHooks() {
    const pkg = this.ctx.pkg;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    for (const arr of PKG_ARRAYS) {
      const target = pkg[arr];
      Object.defineProperty(target, 'push', {
        value: function (...items: any[]) {
          session.safely(() => session.onPush(arr, items));
          return Array.prototype.push.apply(this, items);
        },
        configurable: true,
        writable: true,
        enumerable: false
      });
      this.restorers.push(() => delete target.push);
    }
    const fshMap = pkg.fshMap;
    Object.defineProperty(fshMap, 'set', {
      value: function (key: string, value: any) {
        session.safely(() => session.onFshMapSet(key, value));
        return Map.prototype.set.call(this, key, value);
      },
      configurable: true,
      writable: true,
      enumerable: false
    });
    this.restorers.push(() => delete fshMap.set);
    for (const method of ['fish', 'fishAll']) {
      const orig = pkg[method];
      Object.defineProperty(pkg, method, {
        value: function (item: any, ...types: Type[]) {
          session.safely(() => session.onPackageRead(item, types));
          return orig.call(this, item, ...types);
        },
        configurable: true,
        writable: true,
        enumerable: false
      });
      this.restorers.push(() => delete pkg[method]);
    }
  }

  private installTankHooks() {
    const tank = this.ctx.tank;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    const methods: [string, string][] = [
      ['fish', 'f'],
      ['fishAll', 'a'],
      ['fishForMetadata', 'md'],
      ['fishForMetadatas', 'mds'],
      ['fishForAppliedRuleSet', 'rs'],
      ['resolveAlias', 'al']
    ];
    for (const [method, code] of methods) {
      const orig = tank[method];
      Object.defineProperty(tank, method, {
        value: function (...args: any[]) {
          const depth = session.tankDepth;
          if (depth === 0) {
            session.outerTankMethod = code;
            session.stash = undefined;
          }
          session.tankDepth++;
          let result: any;
          try {
            result = orig.apply(this, args);
          } finally {
            session.tankDepth--;
          }
          if (depth === 0) {
            session.outerTankMethod = null;
            session.safely(() => session.onTankRead(code, args, result));
          } else if (
            depth === 1 &&
            session.stash === undefined &&
            (code === 'f' || code === 'a') &&
            (session.outerTankMethod === 'md' || session.outerTankMethod === 'mds')
          ) {
            session.stash = result;
          }
          return result;
        },
        configurable: true,
        writable: true,
        enumerable: false
      });
      this.restorers.push(() => delete tank[method]);
    }
  }

  enterPostExport(): void {
    if (this.phase !== 'main') {
      return;
    }
    this.phase = 'post';
    if (!this.aborted) {
      this.safely(() => this.checkAfterExport());
    }
  }

  private checkAfterExport(): void {
    // Definitions should only change while they are being exported, and the lookups recorded for
    // replay assume that the things that decide what a lookup finds do not change at all
    let unexpected: string = null;
    this.keyToDef.forEach((def, key) => {
      const kind = this.kindOfKey.get(key);
      if (kind !== 'other' && this.fishSignature(def) !== this.beginSigs.get(key)) {
        unexpected = unexpected ?? `lookup identity of ${key} changed`;
        if (this.records.has(key)) {
          this.failRecord(this.records.get(key), 'identity changed');
        }
      }
      const expected = this.records.has(key)
        ? this.records.get(key).afterHash
        : this.preHash.get(key);
      if (this.replayed.has(key) && this.records.get(key).afterRef == null) {
        // replayed with no recorded change; its definition is still the one hashed at the start
        if (this.hashDef(def) !== this.preHash.get(key)) {
          unexpected = unexpected ?? `definition of ${key} changed outside its export`;
        }
      } else if (this.hashDef(def) !== expected) {
        unexpected = unexpected ?? `definition of ${key} changed outside its export`;
        if (this.records.has(key)) {
          this.failRecord(this.records.get(key), 'definition changed outside export');
        }
      }
    });
    if (unexpected != null) {
      this.unstable = true;
      if (this.replayed.size > 0) {
        this.abort(unexpected);
        return;
      }
    }
    // The recorded FHIR objects must still be what they were when their export finished
    this.liveObjects.forEach(({ obj, payloadHash }, key) => {
      const rec = this.records.get(key);
      const current = this.payloadOf(rec.kind, obj);
      if (current == null || hashString(current) !== payloadHash) {
        this.failRecord(rec, 'changed after export');
        if (this.replayed.size > 0) {
          this.abort(`${key} changed after its export`);
        }
      }
    });
    this.standIns.forEach((obj, key) => {
      const rec = this.records.get(key);
      if (rec.kind !== 'sd') {
        const current = this.payloadOf(rec.kind, obj);
        if (current == null || hashString(current) !== rec.payloadRef) {
          this.abort(`replayed ${key} changed after its export`);
        }
      }
    });
    // Profiles with deferred rules are changed again after all exports
    const sdExporter = this.ctx.structureDefinitionExporter;
    this.liveObjects.forEach(({ obj }, key) => {
      const rec = this.records.get(key);
      if (rec.kind === 'sd') {
        const bindings = sdExporter.knownBindingRules?.get(obj);
        if (sdExporter.deferredCaretRules?.has(obj)) {
          this.failRecord(rec, 'deferred rules');
        } else if (
          bindings != null &&
          (bindings.some((b: any) => b.isInline) || obj.contained?.length > 0)
        ) {
          this.failRecord(rec, 'deferred bindings');
        }
      }
    });
  }

  endExport(): void {
    if (this.phase === 'done') {
      return;
    }
    if (this.phase === 'main') {
      this.enterPostExport();
    }
    this.phase = 'done';
    this.postReads.forEach(key => {
      const rec = this.records.get(key);
      if (rec != null) {
        this.failRecord(rec, 'used after export');
      }
    });
    this.restorers.reverse().forEach(r => r());
    this.restorers = [];
    this.buffering = false;
    const buffered = this.buffer;
    this.buffer = [];
    if (!this.aborted) {
      for (const info of buffered) {
        this.origWrite.call(logger, info);
      }
    }
  }

  /**
   * Stops the export hooks without emitting anything. Used when the export failed or aborted
   * and is going to be redone.
   */
  dispose(flush: boolean): void {
    if (!flush) {
      this.aborted = true;
    }
    this.saveable = false;
    this.restorers.reverse().forEach(r => r());
    this.restorers = [];
    this.buffering = false;
    const buffered = this.buffer;
    this.buffer = [];
    this.phase = 'done';
    if (flush && this.origWrite != null) {
      for (const info of buffered) {
        this.origWrite.call(logger, info);
      }
    }
  }

  // ----------------------------------------------------------------------------------------
  // Hooks from the exporters
  // ----------------------------------------------------------------------------------------

  exportEntity(kind: string, exporter: any, def: any, live: () => any): any {
    if (this.aborted) {
      return undefined;
    }
    const parent = this.top();
    const key = this.defToKey.get(def);
    if (key == null || this.kindOfKey.get(key) !== kind) {
      // Not an entity from the tank (or not the kind we expect), so it cannot be tracked
      this.untracked++;
      this.failStack('untracked export');
      if (parent?.mode === 'replay') {
        this.abort('untracked export during replay');
        return undefined;
      }
      return live();
    }
    const count = (this.frameCount.get(key) ?? 0) + 1;
    this.frameCount.set(key, count);
    const ref = this.exporterRef(kind, exporter, parent);
    if (count === 1 && ref !== 'other') {
      let plan: { old: FrameRecord; standIn: any } = null;
      try {
        plan = this.planReplay(key, kind as EntityKind, def, exporter, parent);
      } catch (e) {
        this.keepError(`checking ${key}`, e);
        this.abort(`could not check ${key}: ${e?.message}`);
        if (this.aborted) {
          return undefined;
        }
      }
      if (plan != null) {
        return this.replay(key, kind as EntityKind, def, exporter, parent, ref, plan);
      }
      this.exportedBecause.set(key, this.lastReason);
    }
    return this.record(key, kind as EntityKind, def, exporter, parent, ref, live, count);
  }

  check(fn: () => void): void {
    const frame = this.top();
    if (frame?.mode === 'record') {
      frame.script.push(['C']);
    }
    this.inCheck++;
    try {
      fn();
    } finally {
      this.inCheck--;
    }
  }

  noteSdCache(exporter: any, url: string, created: boolean): void {
    this.safely(() => {
      const view = this.cacheViews.get(exporter);
      const virtual = view?.get(url);
      if (virtual != null) {
        if (virtual.behind) {
          this.abort(
            `${this.top()?.key} used the cached ${url}, which the replay of ${virtual.by} did not update`
          );
        }
        view.delete(url);
      }
      const frame = this.top();
      if (frame?.mode !== 'record' || this.suppress > 0) {
        return;
      }
      const entry = exporter?.sdCache?.get(url);
      const event: ScriptEvent = ['S', url, created, sdFingerprint(entry), null];
      frame.script.push(event);
      frame.sdTouches.push({ entry, event });
      if (frame.exporter !== exporter) {
        frame.fail('sdCache of another exporter');
      }
    });
  }

  /** The fingerprint of an sdCache entry as it would be had replays really run (null if absent). */
  private cachedFp(exporter: any, url: string): string | null {
    const virtual = this.cacheViews.get(exporter)?.get(url);
    if (virtual != null) {
      return virtual.fp;
    }
    const entry = exporter?.sdCache?.get(url);
    return entry != null ? sdFingerprint(entry) : null;
  }

  /** Checks the sdCache uses of an export against the cache, to tell whether it can be replayed. */
  private sdCacheMatches(script: ScriptEvent[], exporter: any): boolean {
    for (const ev of script) {
      if (ev[0] !== 'S') {
        continue;
      }
      const [, url, created, fp] = ev;
      const current = this.cachedFp(exporter, url);
      if (created ? current != null || this.cacheViews.get(exporter)?.has(url) : current !== fp) {
        return false;
      }
      if (leavesBehind(ev) && exporter === this.ctx.instanceExporter && this.pinnedUrls.has(url)) {
        return false;
      }
    }
    return true;
  }

  /** After a replay, notes how the sdCache would have changed had the export really run. */
  private applySdCacheEffects(script: ScriptEvent[], exporter: any, by: string) {
    for (const ev of script) {
      if (ev[0] !== 'S') {
        continue;
      }
      const [, url, , , endFp] = ev;
      if (!this.cacheViews.has(exporter)) {
        this.cacheViews.set(exporter, new Map());
      }
      this.cacheViews.get(exporter).set(url, { fp: endFp, behind: leavesBehind(ev), by });
    }
  }

  noteNewInstanceExporter(exporter: any): void {
    const frame = this.top();
    if (frame?.mode === 'record') {
      frame.created.push(exporter);
    }
  }

  checkNullValues(resource: any, check: () => void): void {
    const key = this.objKey.get(resource);
    const rec = key != null ? this.records.get(key) : null;
    if (rec != null && rec.kind === 'sd' && this.standIns.get(key) === resource) {
      for (const info of rec.nulls ?? []) {
        this.emit(info);
      }
      return;
    }
    if (rec == null || rec.kind !== 'sd' || !rec.ok) {
      check();
      return;
    }
    const origWrite = logger.write;
    const captured: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    Object.defineProperty(logger, 'write', {
      value: function (info: any, ...rest: any[]) {
        const copy = session.copyInfo(info);
        if (copy == null) {
          session.failRecord(rec, 'unrecordable log');
        } else {
          captured.push(copy);
        }
        return origWrite.call(logger, info, ...rest);
      },
      configurable: true,
      writable: true
    });
    try {
      check();
    } finally {
      delete (logger as any).write;
      if (logger.write !== origWrite) {
        Object.defineProperty(logger, 'write', {
          value: origWrite,
          configurable: true,
          writable: true
        });
      }
    }
    rec.nulls = captured;
  }

  // ----------------------------------------------------------------------------------------
  // Recording
  // ----------------------------------------------------------------------------------------

  private top(): Frame | undefined {
    return this.stack[this.stack.length - 1];
  }

  private recordingFrame(): Frame | null {
    if (this.suppress > 0 || this.phase !== 'main') {
      return null;
    }
    const frame = this.top();
    return frame?.mode === 'record' ? frame : null;
  }

  private exporterRef(kind: string, exporter: any, parent: Frame | undefined): string {
    if (kind === 'sd') {
      return exporter === this.ctx.structureDefinitionExporter ? 'top' : 'other';
    } else if (kind === 'vs') {
      return exporter === this.ctx.valueSetExporter ? 'top' : 'other';
    } else if (kind === 'cs') {
      return exporter === this.ctx.codeSystemExporter ? 'top' : 'other';
    }
    if (exporter === this.ctx.instanceExporter) {
      return 'top';
    } else if (parent != null && exporter === parent.exporter) {
      return 'same';
    } else if (parent != null && parent.created.includes(exporter)) {
      return `new#${parent.created.indexOf(exporter)}`;
    }
    return 'other';
  }

  private record(
    key: string,
    kind: EntityKind,
    def: any,
    exporter: any,
    parent: Frame | undefined,
    ref: string,
    live: () => any,
    count: number
  ): any {
    const frame = new Frame(key, kind, def, exporter, 'record');
    if (this.phase !== 'main') {
      frame.fail('exported after the main export');
    }
    if (count > 1) {
      frame.fail('exported more than once');
      const earlier = this.records.get(key);
      if (earlier != null) {
        this.failRecord(earlier, 'exported more than once');
      }
    }
    if (ref === 'other') {
      frame.fail('unknown exporter');
      parent?.fail('nested export from unknown exporter');
    }
    if (parent == null && ref !== 'top') {
      frame.fail('top-level export from unknown exporter');
    }
    this.stack.push(frame);
    this.status.set(key, 'i');
    let result: any;
    let threw = false;
    let error: any;
    try {
      result = live();
    } catch (e) {
      threw = true;
      error = e;
    } finally {
      this.stack.pop();
    }
    this.status.set(key, 'd');
    frame.subtree.push(key);
    if (!this.aborted) {
      try {
        this.finishRecord(frame, threw);
      } catch (e) {
        this.keepError(`recording ${key}`, e);
        this.abort(`could not record ${key}: ${e?.message}`);
      }
    }
    this.afterChild(parent, frame, ref, threw);
    if (threw) {
      throw error;
    }
    return result;
  }

  private finishRecord(frame: Frame, threw: boolean) {
    const rec: FrameRecord = {
      kind: frame.kind,
      ok: frame.ok,
      why: frame.why,
      pre: this.preHash.get(frame.key),
      script: frame.script,
      deps: Object.fromEntries(frame.deps),
      vis: null,
      afterHash: null,
      threw
    };
    if (threw) {
      this.failRecord(rec, 'threw');
    }
    if (rec.pre == null) {
      this.failRecord(rec, 'unserializable definition');
    }
    for (const { entry, event } of frame.sdTouches) {
      event[4] = sdFingerprint(entry);
    }
    rec.afterHash = this.hashDef(frame.def);
    if (rec.afterHash == null) {
      this.failRecord(rec, 'unserializable definition after export');
    }
    if (frame.pushed.length > 1) {
      this.failRecord(rec, 'pushed more than once');
    }
    let payload: string = null;
    let obj: any;
    if (frame.pushed.length === 1 && !threw) {
      obj = frame.pushed[0].obj;
      rec.arr = frame.pushed[0].arr;
      payload = this.payloadOf(frame.kind, obj);
      if (payload == null) {
        this.failRecord(rec, 'unserializable result');
      }
    } else if (frame.pushed.length === 0 && !threw) {
      payload = '';
    }
    if (payload != null && !threw) {
      rec.vis = hashString(`${rec.arr ?? ''}\n${payload}`);
    }
    if (rec.ok) {
      if (rec.afterHash !== rec.pre) {
        try {
          rec.afterRef = this.store.putPayload(JSON.stringify(encode(frame.def, this.defRegistry)));
        } catch (e) {
          this.storeFailed(frame.key, e);
          this.failRecord(rec, 'could not store definition');
        }
      }
      if (obj != null && rec.ok) {
        try {
          rec.payloadRef = this.store.putPayload(payload);
        } catch (e) {
          this.storeFailed(frame.key, e);
          this.failRecord(rec, 'could not store result');
        }
        if (frame.kind === 'sd') {
          rec.sdProps = this.sdProps(obj);
        }
      }
    }
    if (obj != null && payload != null) {
      this.liveObjects.set(frame.key, { obj, payloadHash: hashString(payload) });
    }
    this.liveVis.set(frame.key, rec.vis);
    this.liveAfter.set(frame.key, rec.afterHash);
    this.records.set(frame.key, rec);
  }

  private payloadOf(kind: EntityKind, obj: any): string | null {
    try {
      if (kind === 'sd') {
        return JSON.stringify({ json: obj.toJSON(true), wjson: obj.toJSON(false) });
      }
      return JSON.stringify({ obj: encode(obj, this.pkgRegistry) });
    } catch (e) {
      if (e instanceof UnserializableError) {
        return null;
      }
      throw e;
    }
  }

  private sdProps(sd: any): string {
    return JSON.stringify([
      this.ctx.pkg.extractMetadata(sd) ?? null,
      sd.getFileName(),
      ...SD_PROPS.map(p => sd[p] ?? null)
    ]);
  }

  private failRecord(rec: FrameRecord, why: string) {
    if (rec.ok) {
      rec.ok = false;
      rec.why = why;
    }
  }

  private afterChild(parent: Frame | undefined, child: Frame, ref: string, threw: boolean) {
    if (parent == null) {
      return;
    }
    parent.subtree.push(...child.subtree);
    if (parent.mode === 'record') {
      parent.script.push(['T', child.key, ref, threw, child.subtree.slice()]);
      parent.segment.clear();
    }
  }

  private failStack(why: string) {
    for (const frame of this.stack) {
      if (frame.mode === 'record') {
        frame.fail(why);
      }
    }
  }

  private stateOf(key: string): State {
    const status = this.status.get(key);
    if (status != null) {
      return status;
    }
    return this.kindOfKey.get(key) === 'other' ? 'n' : 'p';
  }

  /** Reading an entity that is still being exported. */
  private readInProgress(key: string) {
    const owner = this.stack.find(f => f.key === key);
    if (owner?.mode === 'replay') {
      this.abort(`${key} was read while being replayed`);
    }
    this.failStack('read an entity that was still being exported');
  }

  private onLog(info: any, rest: any[]) {
    if (this.aborted) {
      // nothing logged during an aborted export is kept
      return true;
    }
    const frame = this.recordingFrame();
    if (this.suppress > 0) {
      // lookups made to check whether something can be replayed must not log anything
      return true;
    }
    if (frame != null && this.inCheck === 0) {
      const copy = this.copyInfo(info);
      if (copy == null) {
        frame.fail('unrecordable log');
      } else {
        frame.script.push(['L', copy]);
      }
    }
    if (this.buffering) {
      this.buffer.push(info);
      return true;
    }
    return this.origWrite.call(logger, info, ...rest);
  }

  private copyInfo(info: any): any {
    return copyLogInfo(info);
  }

  private emit(copy: any) {
    emitLogInfo(copy);
  }

  private onPush(arr: string, items: any[]) {
    const frame = this.top();
    for (const obj of items) {
      if (frame != null) {
        this.objKey.set(obj, frame.key);
      }
    }
    if (frame == null) {
      return;
    }
    for (const obj of items) {
      frame.pushed.push({ arr, obj });
    }
    if (frame.mode === 'record') {
      frame.script.push(['P', arr]);
      frame.segment.clear();
      if (items.length !== 1) {
        frame.fail('unexpected push');
      }
    }
  }

  private onFshMapSet(fileName: string, value: any) {
    const frame = this.recordingFrame();
    if (frame == null) {
      return;
    }
    try {
      frame.script.push(['M', fileName, JSON.parse(JSON.stringify(value))]);
    } catch {
      frame.fail('unrecordable fshMap entry');
    }
  }

  private matchKeys(item: any, types: Type[]): string[] | null {
    const matches: any[] = this.ctx.pkg.findAllMatches(item, ...types);
    const keys: string[] = [];
    for (const m of matches) {
      const key = this.objKey.get(m);
      if (key == null) {
        return null;
      }
      keys.push(key);
    }
    return keys;
  }

  private onPackageRead(item: any, types: Type[]) {
    if (this.suppress > 0) {
      return;
    }
    if (this.phase === 'post') {
      // Some post-export steps change what they find, so whatever they find cannot be reused
      const keys = this.matchKeys(item, types);
      if (keys == null) {
        return;
      }
      keys.forEach(k => {
        this.postReads.add(k);
        if (this.replayed.has(k) && this.stack.length === 0) {
          this.abort(`replayed ${k} was used after export`);
        }
      });
      return;
    }
    const frame = this.recordingFrame();
    if (frame == null) {
      return;
    }
    if (types.length === 1 && types[0] === Type.Type) {
      return;
    }
    const segKey = `R${JSON.stringify([item ?? null, types])}`;
    if (frame.segment.has(segKey)) {
      return;
    }
    frame.segment.add(segKey);
    const keys = this.matchKeys(item, types);
    if (keys == null) {
      frame.fail('found an untracked package object');
      return;
    }
    for (const k of keys) {
      if (k !== frame.key && this.status.get(k) === 'i') {
        this.readInProgress(k);
      }
    }
    frame.script.push(['R', item ?? null, types, keys]);
  }

  private onTankRead(code: string, args: any[], result: any) {
    const frame = this.recordingFrame();
    if (frame == null) {
      return;
    }
    if (code === 'al') {
      const name = args[0];
      if (!frame.aliases.has(name)) {
        frame.aliases.add(name);
        frame.script.push(['A', name, result ?? null]);
      }
      return;
    }
    const item = args[0] ?? null;
    const types: Type[] = code === 'rs' ? [] : args.slice(1);
    if (types.length === 1 && types[0] === Type.Type) {
      return;
    }
    const segKey = `Q${code}${JSON.stringify([item, types])}`;
    if (frame.segment.has(segKey)) {
      return;
    }
    frame.segment.add(segKey);
    let found: any[];
    if (code === 'f' || code === 'rs') {
      found = result != null ? [result] : [];
    } else if (code === 'a') {
      found = result ?? [];
    } else if (code === 'md') {
      found = this.stash != null ? [this.stash] : [];
    } else {
      found = this.stash ?? [];
    }
    const keys: string[] = [];
    for (const def of found) {
      const key = this.defToKey.get(def);
      if (key == null) {
        frame.fail('found an untracked definition');
        return;
      }
      keys.push(key);
    }
    const states = keys.map(k => (k === frame.key ? 'i' : this.stateOf(k)));
    keys.forEach((k, i) => {
      if (k !== frame.key && states[i] === 'i') {
        this.readInProgress(k);
      }
    });
    let extra: string;
    if (code === 'md' || code === 'mds') {
      if (keys.some(k => k.startsWith('RuleSet:'))) {
        frame.fail('metadata lookup of a RuleSet');
      }
      extra = hashString(JSON.stringify(result ?? null));
    } else {
      keys.forEach(k => frame.deps.set(k, this.preHash.get(k)));
    }
    const ev: ScriptEvent = ['Q', code, item, types, keys, states];
    if (extra != null) {
      ev.push(extra);
    }
    frame.script.push(ev);
  }

  // ----------------------------------------------------------------------------------------
  // Replay
  // ----------------------------------------------------------------------------------------

  private reason(why: string) {
    this.reasons[why] = (this.reasons[why] ?? 0) + 1;
    this.lastReason = why;
    return null as null;
  }

  /** Whether a dependency produced exactly what it produced when the entity was recorded. */
  private sameOutput(key: string): boolean {
    if (this.replayed.has(key)) {
      return true;
    }
    const old = this.oldRecords.get(key);
    const vis = this.liveVis.get(key);
    return (
      old != null &&
      vis != null &&
      vis === old.vis &&
      this.liveAfter.get(key) != null &&
      this.liveAfter.get(key) === old.afterHash
    );
  }

  private probe(ev: ScriptEvent): boolean {
    const memoKey = JSON.stringify(ev.slice(0, ev[0] === 'A' ? 2 : 4));
    let value = this.probeMemo.get(memoKey);
    if (value == null) {
      const tank = this.ctx.tank;
      this.suppress++;
      try {
        if (ev[0] === 'A') {
          value = JSON.stringify(tank.resolveAlias(ev[1]) ?? null);
        } else {
          const [, code, item, types] = ev as any[];
          const keyOf = (def: any) => this.defToKey.get(def) ?? '!unknown';
          if (code === 'f') {
            value = JSON.stringify([tank.fish(item, ...types)].filter(d => d != null).map(keyOf));
          } else if (code === 'a') {
            value = JSON.stringify(tank.fishAll(item, ...types).map(keyOf));
          } else if (code === 'rs') {
            value = JSON.stringify(
              [tank.fishForAppliedRuleSet(item)].filter(d => d != null).map(keyOf)
            );
          } else {
            const found: any[] =
              code === 'md'
                ? [tank.fish(item, ...types)].filter(d => d != null)
                : tank.fishAll(item, ...types);
            if (found.some(d => keyOf(d).startsWith('RuleSet:') || keyOf(d) === '!unknown')) {
              value = '!ruleset';
            } else {
              const result =
                code === 'md'
                  ? tank.fishForMetadata(item, ...types)
                  : tank.fishForMetadatas(item, ...types);
              value = hashString(JSON.stringify(result ?? null));
            }
          }
        }
      } catch {
        value = '!error';
      } finally {
        this.suppress--;
      }
      this.probeMemo.set(memoKey, value);
    }
    if (ev[0] === 'A') {
      return value === JSON.stringify(ev[2]);
    } else if (ev[1] === 'md' || ev[1] === 'mds') {
      return value === ev[6];
    }
    return value === JSON.stringify(ev[4]);
  }

  private planReplay(
    key: string,
    kind: EntityKind,
    def: any,
    exporter: any,
    parent: Frame | undefined
  ): { old: FrameRecord; standIn: any } | null {
    if (!this.replayEnabled || this.phase !== 'main') {
      return null;
    }
    const old = this.oldRecords.get(key);
    if (old == null) {
      return this.reason('new');
    }
    this.consultedOld = true;
    if (!old.ok) {
      return this.reason(`not reusable: ${old.why}`);
    }
    if (old.kind !== kind || this.status.has(key)) {
      return this.reason('unexpected state');
    }
    const pre = this.preHash.get(key);
    if (pre == null || pre !== old.pre) {
      return this.reason('changed');
    }
    for (const [dep, hash] of Object.entries(old.deps)) {
      if (this.preHash.get(dep) !== hash) {
        return this.reason('dependency changed');
      }
    }
    if (parent == null && old.script.length === 0 && old.payloadRef == null) {
      return this.reason('nothing recorded');
    }
    const pending = new Set<string>();
    const ownKeys = new Set<string>();
    for (const ev of old.script) {
      switch (ev[0]) {
        case 'R': {
          const now = this.matchKeys(ev[1], ev[2] as Type[]);
          if (now == null) {
            return this.reason('untracked package object');
          }
          const current = now.filter(k => k !== key);
          const expected = ev[3].filter(k => k !== key && !pending.has(k));
          if (!sameSequence(current, expected)) {
            return this.reason('package lookup differs');
          }
          if (!current.every(k => this.sameOutput(k))) {
            return this.reason('package lookup found changed output');
          }
          break;
        }
        case 'Q': {
          if (!this.probe(ev)) {
            return this.reason('tank lookup differs');
          }
          const [, code, , , keys, states] = ev;
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const now = k === key ? 'i' : this.stateOf(k);
            if (now === states[i]) {
              if (
                now === 'd' &&
                (code === 'f' || code === 'a' || code === 'rs') &&
                !this.sameOutput(k)
              ) {
                return this.reason('tank lookup found changed definition');
              }
            } else if (!(states[i] === 'd' && now === 'p' && pending.has(k))) {
              return this.reason('tank lookup state differs');
            }
          }
          break;
        }
        case 'A':
          if (!this.probe(ev)) {
            return this.reason('alias differs');
          }
          break;
        case 'S':
          if (!this.sdCacheMatches([ev], exporter)) {
            return this.reason('sdCache differs');
          }
          break;
        case 'T': {
          const [, child, ref, , subtree] = ev;
          if (ref === 'other') {
            return this.reason('unknown exporter');
          }
          for (const k of subtree) {
            const rec = this.oldRecords.get(k);
            if (this.status.has(k) || ownKeys.has(k)) {
              return this.reason('nested export already done');
            }
            if (rec == null || !rec.ok || this.preHash.get(k) !== rec.pre) {
              return this.reason('nested export not reusable');
            }
            ownKeys.add(k);
            pending.add(k);
          }
          if (!this.keyToDef.has(child)) {
            return this.reason('nested export missing');
          }
          break;
        }
        default:
          break;
      }
    }
    let standIn: any = null;
    if (old.payloadRef != null) {
      try {
        const payload = this.store.getPayload(old.payloadRef);
        if (kind === 'sd') {
          standIn = this.makeStructureDefinition(payload);
          // inProgress is not part of the JSON; it is false once an export has finished
          const recordedInProgress = JSON.parse(old.sdProps).at(-1);
          if (recordedInProgress != null) {
            standIn.inProgress = recordedInProgress;
          }
          if (this.sdProps(standIn) !== old.sdProps) {
            return this.reason('stand-in differs');
          }
        } else {
          standIn = decode(payload.obj, this.pkgRegistry);
        }
      } catch (e) {
        this.keepError(`reading the cached result of ${key}`, e);
        this.store.readFailed(e);
        return this.reason('cache read failed');
      }
    } else if (old.script.some(ev => ev[0] === 'P')) {
      return this.reason('missing result');
    }
    return { old, standIn };
  }

  private makeStructureDefinition(payload: { json: any; wjson: any }): StructureDefinition {
    const sd = StructureDefinition.fromJSON(cloneDeep(payload.json));
    Object.defineProperty(sd, 'toJSON', {
      value: (snapshot = true) => cloneDeep(snapshot ? payload.json : payload.wjson),
      enumerable: false,
      configurable: true,
      writable: true
    });
    return sd;
  }

  private replay(
    key: string,
    kind: EntityKind,
    def: any,
    exporter: any,
    parent: Frame | undefined,
    ref: string,
    plan: { old: FrameRecord; standIn: any }
  ): any {
    const { old, standIn } = plan;
    const frame = new Frame(key, kind, def, exporter, 'replay');
    // exporters created while replaying are found by their position, as they were when recording
    const created = frame.created;
    this.stack.push(frame);
    this.status.set(key, 'i');
    try {
      for (const ev of old.script) {
        if (this.aborted) {
          break;
        }
        switch (ev[0]) {
          case 'L':
            this.emit(ev[1]);
            break;
          case 'P':
            this.standIns.set(key, standIn);
            this.ctx.pkg[ev[1]].push(standIn);
            break;
          case 'M':
            this.ctx.pkg.fshMap.set(ev[1], { ...ev[2] });
            break;
          case 'C':
            this.check(() => exporter.checkForDuplicateId(standIn, def));
            break;
          case 'S':
            if (!this.sdCacheMatches([ev], exporter)) {
              throw new AbortedError(`sdCache use by ${key} differs during replay`);
            }
            this.applySdCacheEffects([ev], exporter, key);
            break;
          case 'R': {
            const now = this.matchKeys(ev[1], ev[2] as Type[]);
            if (
              now == null ||
              !sameSequence(
                now.filter(k => k !== key),
                ev[3].filter(k => k !== key)
              )
            ) {
              throw new AbortedError(`package lookup by ${key} differs during replay`);
            }
            break;
          }
          case 'Q': {
            const [, , , , keys, states] = ev;
            keys.forEach((k, i) => {
              if ((k === key ? 'i' : this.stateOf(k)) !== states[i]) {
                throw new AbortedError(`tank lookup by ${key} differs during replay`);
              }
            });
            break;
          }
          case 'T': {
            const [, child, childRef, threw] = ev;
            const childDef = this.keyToDef.get(child);
            const childKind = this.kindOfKey.get(child);
            let childThrew = false;
            let childError: any = null;
            try {
              if (childKind === 'sd') {
                this.ctx.structureDefinitionExporter.exportStructDef(childDef);
              } else {
                let childExporter: any;
                if (childRef === 'top') {
                  childExporter = this.ctx.instanceExporter;
                } else if (childRef === 'same') {
                  childExporter = exporter;
                } else {
                  const index = parseInt(childRef.slice(4));
                  created[index] =
                    created[index] ??
                    new InstanceExporter(this.ctx.tank, this.ctx.pkg, this.ctx.fisher);
                  childExporter = created[index];
                }
                childExporter.exportInstance(childDef);
              }
            } catch (e) {
              childThrew = true;
              childError = e;
            }
            if (this.aborted) {
              break;
            }
            if (childThrew !== threw || this.status.get(child) !== 'd' || !this.sameOutput(child)) {
              const error = childError != null ? ` (it threw: ${childError?.message})` : '';
              if (childError != null) {
                this.keepError(`replaying the nested export of ${child}`, childError);
              }
              throw new AbortedError(`nested export of ${child} differs during replay${error}`);
            }
            break;
          }
          default:
            break;
        }
      }
    } catch (e) {
      if (e instanceof AbortedError) {
        this.abort(e.message);
      } else {
        this.keepError(`replaying ${key}`, e);
        this.abort(`replay of ${key} failed: ${e?.message}`);
      }
    } finally {
      this.stack.pop();
    }
    if (this.aborted) {
      return undefined;
    }
    if (old.afterRef != null) {
      try {
        replaceOwnProperties(def, decode(this.store.getPayload(old.afterRef), this.defRegistry));
      } catch (e) {
        this.keepError(`restoring ${key}`, e);
        this.store.readFailed(e);
        this.abort(`could not restore ${key}: ${e?.message}`);
        return undefined;
      }
    }
    this.status.set(key, 'd');
    this.replayed.add(key);
    frame.subtree.push(key);
    this.records.set(key, old);
    this.afterChild(parent, frame, ref, false);
    return standIn ?? undefined;
  }

  /** Runs bookkeeping that must never break the export itself. */
  private safely(fn: () => void) {
    try {
      fn();
    } catch (e) {
      this.keepError('bookkeeping', e);
      this.abort(`incremental bookkeeping failed: ${e?.message}`);
    }
  }

  /** Keeps a failure to store a record's payload (only the first is reported as a write error). */
  private storeFailed(key: string, e: any) {
    this.keepError(`storing ${key}`, e);
    this.store.writeFailed(e);
  }

  /** Keeps an unexpected error, with its stack, for debugging. */
  private keepError(during: string, e: any) {
    this.errors.push(`while ${during}: ${e?.stack ?? e}`);
  }

  private abort(why: string) {
    if (!this.mayReplay) {
      // Nothing was replayed or can be, so the export is exactly what it would be without a
      // session. It just cannot be trusted as a record for the next build.
      this.saveable = false;
      this.abortReason = this.abortReason ?? why;
      return;
    }
    if (!this.aborted) {
      this.aborted = true;
      this.abortReason = why;
    }
  }
}
