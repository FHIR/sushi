import fs from 'fs';
import path from 'path';
import { FSHImporter, FSHTank, RawFSH } from '../import';
import { ParseCache } from './ParseCache';
import { exportFHIR, Package } from '../export';
import { FHIRDefinitions } from '../fhirdefs';
import { Configuration } from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { fillTank } from '../utils/Processing';
import { incrementalHooks } from './hooks';
import { CACHE_FORMAT, CacheStore, Manifest } from './CacheStore';
import { ExportSession, ExportState, ExportStats } from './ExportSession';
import { exportKey, toolKey } from './cacheKey';
import { decode, encode } from './serialize';
import { captureLogs, holdLogs } from './logCapture';
import { definitionRegistry } from './registries';

/**
 * Coordinates an incremental build. Every step falls back to doing the work normally if anything
 * about the cache is missing, unreadable, or does not fit, so an incremental build always produces
 * the same output as a normal one; it is only faster when the cache can be used.
 */
export class IncrementalBuild {
  private readonly store: CacheStore;
  private manifest: Manifest | null = null;
  private tool: string;
  private key: string = null;
  private session: ExportSession = null;
  private disabled: string = null;
  private parseCache: ParseCache = null;
  private notes: string[] = [];
  private redone = false;

  constructor(
    private readonly projectDir: string,
    sushiVersion: string
  ) {
    this.store = CacheStore.forProject(projectDir);
    // so a build that stops early does not leave the summary of an earlier one
    try {
      fs.rmSync(path.join(this.store.dir, 'last-run.json'), { force: true });
    } catch (e) {
      logger.info(`Incremental build: could not remove the debugging summary (${e.message}).`);
    }
    try {
      this.tool = toolKey(sushiVersion);
      this.store.open();
      this.manifest = this.store.readManifest();
      if (this.store.manifestProblem != null) {
        this.note(`${this.store.manifestProblem}, so nothing was reused`);
      }
    } catch (e) {
      this.disabled = `cache unavailable (${e.message})`;
    }
  }

  importFSH(rawFSH: RawFSH[], config: Configuration): FSHTank {
    this.source = { rawFSH, config };
    if (this.disabled != null) {
      return fillTank(rawFSH, config);
    }
    const old = this.manifest?.parseKey === this.tool ? (this.manifest.parse ?? null) : null;
    this.parseCache = new ParseCache(this.store, old);
    logger.info('Importing FSH text...');
    const docs = new FSHImporter().import(rawFSH, this.parseCache);
    return new FSHTank(docs, config);
  }

  private source: { rawFSH: RawFSH[]; config: Configuration } = null;

  exportFHIR(tank: FSHTank, defs: FHIRDefinitions, options: any, config: Configuration): Package {
    try {
      if (this.disabled == null) {
        try {
          this.key = exportKey(this.tool, options, config, this.readConfigText(), defs);
        } catch (e) {
          this.exportSkipped = e.message;
        }
      }
      if (this.disabled != null || this.exportSkipped != null) {
        return exportFHIR(tank, defs);
      }
      return this.exportWithSessions(tank, defs);
    } catch (e) {
      // The export fails as it would without the cache, but still say what happened, and do not
      // leave records that may be what made it fail
      this.failed = true;
      this.logSummary();
      this.finish();
      throw e;
    }
  }

  private exportWithSessions(tank: FSHTank, defs: FHIRDefinitions): Package {
    let old: ExportState = null;
    if (this.manifest != null && this.manifest.globalKey !== this.key) {
      this.note(
        'exports were not reused, as the options, configuration, dependencies or SUSHI changed'
      );
    } else if (this.manifest != null && this.manifest.export == null) {
      this.note('exports were not reused, as the previous build could not save them');
    } else if (this.manifest != null) {
      old = this.manifest.export;
    }
    let snapshot: string = null;
    if (old != null) {
      // Replaying can be abandoned partway through, and the export changes the definitions in the
      // tank, so keep a copy of them to start over from
      try {
        snapshot = JSON.stringify(encode(tank.docs, definitionRegistry()));
      } catch (e) {
        old = null;
        this.note(`exports were not reused, as the definitions could not be copied (${e.message})`);
      }
    }
    const first = new ExportSession(this.store, old);
    this.first = first;
    this.session = first;
    // If the export is redone, nothing the first attempt logged may be kept. The session drops what
    // it logged itself; this holds the rest, such as errors from applying insert rules before it
    // begins.
    const held = old != null ? holdLogs() : null;
    let pkg: Package;
    try {
      pkg = this.runSession(first, () => exportFHIR(tank, defs), old != null);
    } catch (e) {
      held?.release(true);
      throw e;
    } finally {
      this.usedPrevious = first.consultedOld;
    }
    if (pkg != null && !first.aborted) {
      held?.release(true);
      return pkg;
    }
    // Nothing the first attempt did is kept: not its records, nor what it logged
    held?.release(false);
    first.dispose(false);
    this.abandoned = first.stats;
    const why = first.abortReason ?? 'of an unknown problem';
    let copy: any[];
    try {
      copy = this.restoreSnapshot(snapshot);
    } catch (e) {
      // This should never happen, so do whatever a build without the cache would do, without
      // depending on anything the first attempt used
      first.errors.push(`while copying the definitions: ${e?.stack ?? e}`);
      this.note(
        `exported everything without the cache, because ${why}, and the definitions could not be copied (${e.message})`
      );
      this.session = null;
      this.fellBack = true;
      this.redone = true;
      return this.exportWithoutCache(defs);
    }
    this.note(`exported everything again, because ${why}`);
    // Start over from the original definitions, and export everything without replaying
    this.redone = true;
    const fresh = new FSHTank(copy, tank.config);
    const second = new ExportSession(this.store, null);
    this.session = second;
    return this.runSession(second, () => exportFHIR(fresh, defs), false);
  }

  private restoreSnapshot(snapshot: string): any[] {
    return decode(JSON.parse(snapshot), definitionRegistry());
  }

  /** Imports the FSH again, without the parse cache, and exports it as a normal build would. */
  private exportWithoutCache(defs: FHIRDefinitions): Package {
    try {
      // what importing logs was already logged, when the FSH was first imported
      const tank = captureLogs(() => fillTank(this.source.rawFSH, this.source.config), true).result;
      return exportFHIR(tank, defs);
    } catch (e) {
      // this is the error a build without the cache shows; the first attempt's is kept for
      // debugging, with its stack
      this.first?.errors.push(`while exporting without the cache: ${e?.stack ?? e}`);
      throw e;
    }
  }

  private abandoned: ExportStats = null;
  private fellBack = false;
  private first: ExportSession = null;
  // Whether the previous build's records were used (so they are not kept if this build fails)
  private usedPrevious = false;
  // Why exports could not be reused at all, although imports could
  private exportSkipped: string = null;
  private failed = false;

  /** Something the summary should explain */
  private note(text: string) {
    this.notes.push(text);
  }

  /**
   * Runs an export with the session active. If the export throws, a session that may have
   * replayed something is abandoned (returning null), so the export can be redone; otherwise its
   * output is kept, and the error is passed on as it would be without a session.
   */
  private runSession(session: ExportSession, run: () => Package, canRedo: boolean): Package {
    incrementalHooks.session = session;
    try {
      return run();
    } catch (e) {
      const failed = `the export failed: ${e?.message}`;
      session.abortReason =
        session.abortReason != null ? `${session.abortReason}, then ${failed}` : failed;
      session.errors.push(`export: ${e?.stack ?? e}`);
      // Nothing was replayed if replaying was turned off, so the error is that of a normal build
      const redo = canRedo && session.mayReplay;
      session.dispose(!redo);
      incrementalHooks.session = null;
      if (redo) {
        return null;
      }
      throw e;
    } finally {
      if (session.aborted && incrementalHooks.session === session) {
        incrementalHooks.session = null;
      }
    }
  }

  /** Logs how much of the export was reused. */
  logSummary() {
    if (this.disabled != null) {
      logger.info(`Incremental build: not used, ${this.disabled}.`);
      return;
    }
    const parse = this.parseCache;
    const files = `${parse.hits} of ${parse.hits + parse.misses} files`;
    const failed = this.failed ? ', before the export failed' : '';
    const session = this.session;
    const notes = [...(this.first?.notes ?? []), ...this.notes];
    if (session == null && this.fellBack) {
      logger.info(
        `Incremental build: imported all ${parse.hits + parse.misses} files again, and reused no exports (cached results did not apply; exported everything without the cache)${failed}.`
      );
    } else if (session == null) {
      const why =
        this.exportSkipped != null
          ? `, as the build could not be identified (${this.exportSkipped})`
          : '';
      logger.info(`Incremental build: reused ${files}, but no exports${why}${failed}.`);
    } else {
      const stats = session.stats;
      const redo = this.redone ? ' (cached results did not apply; exported everything)' : '';
      logger.info(
        `Incremental build: reused ${files}, ${stats.replayed} of ${stats.exported} exports${redo}${failed}.`
      );
      if (!session.saveable) {
        notes.push(
          `this build's exports cannot be reused (${session.abortReason ?? 'unknown reason'})`
        );
      } else if (session.unstable) {
        notes.push('the next build will not reuse exports, as a definition changed unexpectedly');
      }
    }
    if (this.store.corruptPayloads > 0) {
      notes.push(`removed ${this.store.corruptPayloads} corrupt file(s) from the cache`);
    }
    if (this.store.readFailures > 0) {
      notes.push(
        `could not use ${this.store.readFailures} cached result(s) (first: ${this.store.readError})`
      );
    }
    if (this.store.writeError != null) {
      notes.push(`could not write to the cache (${this.store.writeError})`);
    }
    // Cache problems are reported as information, so the error and warning counts stay those of
    // a normal build
    notes.forEach(text => logger.info(`Incremental build: ${text}.`));
    this.logErrors();
  }

  private logErrors() {
    const sessions = this.first === this.session ? [this.session] : [this.first, this.session];
    [...this.parseCache.errors, ...sessions.flatMap(session => session?.errors ?? [])].forEach(
      error => logger.debug(`Incremental build: unexpected error ${error}`)
    );
    this.parseCache.skippedFiles.forEach(text => logger.debug(`Incremental build: ${text}.`));
  }

  /** Saves what this build recorded, for the next build. Must be called after the output is written. */
  finish() {
    incrementalHooks.session = null;
    if (this.disabled != null) {
      return;
    }
    const session = this.session;
    try {
      let exportState = session?.saveable ? session.getState() : null;
      let globalKey = this.key ?? '';
      if (this.exportSkipped != null) {
        // Nothing is known about the exports, so keep what the previous build recorded; the next
        // build checks whether it applies, as always
        globalKey = this.manifest?.globalKey ?? '';
        exportState = this.manifest?.export ?? null;
      } else if (
        exportState == null &&
        !this.usedPrevious &&
        this.manifest?.globalKey === this.key
      ) {
        // Keep what the previous build recorded, if this build did not even try to use it (when it
        // did, it may be what made this build fail); it is checked before it is used, like any
        // record
        exportState = this.manifest.export ?? null;
      }
      const manifest: Manifest = {
        format: CACHE_FORMAT,
        globalKey,
        parseKey: this.tool,
        export: exportState,
        parse: this.parseCache.entries
      };
      this.store.writeManifest(manifest);
      const referenced = new Set<string>();
      Object.values(this.parseCache.entries).forEach(entry => referenced.add(entry.ref));
      for (const rec of Object.values(exportState?.records ?? {})) {
        if (rec.payloadRef) {
          referenced.add(rec.payloadRef);
        }
        if (rec.afterRef) {
          referenced.add(rec.afterRef);
        }
      }
      this.store.collectGarbage(referenced);
      if (this.store.cleanupError != null) {
        logger.info(
          `Incremental build: could not remove some files from the cache (${this.store.cleanupError}).`
        );
      }
    } catch (e) {
      // The cache is only an optimization; the next build will just do more work
      logger.info(`Incremental build: could not save the cache (${e.message}).`);
    }
    if (process.env.SUSHI_INCREMENTAL_DEBUG) {
      try {
        fs.writeFileSync(
          path.join(this.store.dir, 'last-run.json'),
          JSON.stringify(
            {
              ...session?.stats,
              redone: this.redone,
              fellBack: this.fellBack,
              failed: this.failed,
              abandoned: this.abandoned
            },
            null,
            2
          )
        );
      } catch (e) {
        logger.info(`Incremental build: could not write the debugging summary (${e.message}).`);
      }
    }
  }

  private readConfigText(): string {
    for (const name of ['sushi-config.yaml', 'sushi-config.yml']) {
      const file = path.join(this.projectDir, name);
      if (fs.existsSync(file)) {
        return `${name}\n${fs.readFileSync(file, 'utf8')}`;
      }
    }
    return '';
  }
}
