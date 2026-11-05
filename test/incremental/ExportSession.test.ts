import { CodeSystemExporter, exportFHIR, InstanceExporter, Package } from '../../src/export';
import { StructureDefinition } from '../../src/fhirtypes';
import { FSHTank, RawFSH, importText } from '../../src/import';
import { FHIRDefinitions } from '../../src/fhirdefs';
import { ExportSession, ExportState } from '../../src/incremental/ExportSession';
import { PayloadStore } from '../../src/incremental/CacheStore';
import { incrementalHooks } from '../../src/incremental/hooks';
import { captureLogs } from '../../src/incremental/logCapture';
import { logger } from '../../src/utils/FSHLogger';
import { hashString } from '../../src/incremental/serialize';
import { getTestFHIRDefinitions, loggerSpy, testDefsPath } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';

class MemoryStore implements PayloadStore {
  readonly payloads = new Map<string, string>();
  failReads = false;
  readFailures = 0;
  writeFailures = 0;

  readFailed(): void {
    this.readFailures++;
  }

  writeFailed(): void {
    this.writeFailures++;
  }

  putPayload(json: string): string {
    const ref = hashString(json);
    this.payloads.set(ref, json);
    return ref;
  }

  getPayload(ref: string): any {
    if (this.failReads || !this.payloads.has(ref)) {
      throw new Error('missing payload');
    }
    return JSON.parse(this.payloads.get(ref));
  }
}

const FILES: Record<string, string> = {
  'aliases.fsh': `
Alias: $sct = http://snomed.info/sct
Alias: $loinc = http://loinc.org
`,
  'rulesets.fsh': `
RuleSet: Common
* ^status = #active
* ^publisher = "Example Publisher"

RuleSet: Flag(path)
* {path} MS
`,
  'profiles.fsh': `
Profile: MyPatient
Parent: Patient
* insert Common
* insert Flag(name)
* name 1..*
* gender = #female

Profile: MyObservation
Parent: Observation
* insert Common
* subject only Reference(MyPatient)
* code from MyVS (required)
* code ^short = "The code"

Profile: MyChildPatient
Parent: MyPatient
* birthDate 1..1

Extension: MyExtension
* value[x] only string
`,
  'terminology.fsh': `
ValueSet: MyVS
* include codes from system MyCS
* $sct#123 "Something"

CodeSystem: MyCS
* #a "A"
* #b "B"
`,
  'instances.fsh': `
Instance: Pat
InstanceOf: MyPatient
* name.family = "Smith"
* gender = #female

Instance: Obs
InstanceOf: MyObservation
* status = #final
* code = MyCS#a
* subject = Reference(Pat)
* contained[0] = InlinePat

Instance: InlinePat
InstanceOf: Patient
Usage: #inline
* name.family = "Inline"

Instance: Child
InstanceOf: MyChildPatient
* name.family = "Child"
* birthDate = "2020-01-01"

Instance: Bad
InstanceOf: Patient
* notAnElement = "value"
`
};

describe('ExportSession', () => {
  let defs: FHIRDefinitions;

  beforeAll(async () => {
    defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  afterEach(() => {
    incrementalHooks.session = null;
  });

  function output(pkg: Package) {
    return JSON.stringify({
      profiles: pkg.profiles.map(sd => sd.toJSON(true)),
      differentials: pkg.profiles.map(sd => sd.toJSON(false)),
      extensions: pkg.extensions.map(sd => sd.toJSON(true)),
      valueSets: pkg.valueSets.map(vs => vs.toJSON()),
      codeSystems: pkg.codeSystems.map(cs => cs.toJSON()),
      instances: pkg.instances.map(i => i.toJSON()),
      fileNames: [...pkg.profiles, ...pkg.extensions, ...pkg.valueSets, ...pkg.codeSystems].map(r =>
        r.getFileName()
      ),
      fshMap: [...pkg.fshMap.entries()]
    });
  }

  function logs() {
    // debug logs carry stack traces, which naturally differ between call paths
    return loggerSpy
      .getAllLogs()
      .filter(l => l.level !== 'debug')
      .map(l => [l.level, l.message, l.file, l.location]);
  }

  function run(files: Record<string, string>, session?: ExportSession) {
    loggerSpy.reset();
    const docs = importText(Object.entries(files).map(([path, text]) => new RawFSH(text, path)));
    const tank = new FSHTank(docs, minimalConfig);
    loggerSpy.reset();
    incrementalHooks.session = session ?? null;
    try {
      const pkg = exportFHIR(tank, defs);
      return { out: output(pkg), logs: logs() };
    } finally {
      incrementalHooks.session = null;
    }
  }

  function record(files: Record<string, string>, store: MemoryStore): ExportState {
    const session = new ExportSession(store, null);
    run(files, session);
    expect(session.aborted).toBe(false);
    return session.getState();
  }

  it('should export exactly as without a session when recording', () => {
    const plain = run(FILES);
    const session = new ExportSession(new MemoryStore(), null);
    const recorded = run(FILES, session);
    expect(recorded).toEqual(plain);
    expect(session.stats.replayed).toBe(0);
    expect(session.stats.exported).toBeGreaterThan(5);
    // the bad instance produces an error, which must be kept
    expect(plain.logs.some(l => l[0] === 'error')).toBe(true);
  });

  it('should replay everything when nothing changed, with the same output and logs', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const plain = run(FILES);
    const session = new ExportSession(store, state);
    const replayed = run(FILES, session);
    expect(session.aborted).toBe(false);
    expect(replayed).toEqual(plain);
    // everything except the instance that failed with an error can be reused
    expect(session.stats.replayed).toBeGreaterThan(0);
    expect(session.stats.replayed).toBe(Object.values(state.records).filter(rec => rec.ok).length);
  });

  it('should re-export a changed profile and what depends on it', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const changed = {
      ...FILES,
      'profiles.fsh': FILES['profiles.fsh'].replace('* name 1..*', '* name 2..*')
    };
    const plain = run(changed);
    const session = new ExportSession(store, state);
    const result = run(changed, session);
    expect(session.aborted).toBe(false);
    expect(result).toEqual(plain);
    expect(session.stats.reasons.changed).toBeGreaterThan(0);
    // the CodeSystem does not depend on the profile, so it is reused
    expect(session.stats.replayed).toBeGreaterThan(0);
  });

  it('should re-export what uses a changed RuleSet', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const changed = {
      ...FILES,
      'rulesets.fsh': FILES['rulesets.fsh'].replace('Example Publisher', 'Other Publisher')
    };
    const plain = run(changed);
    const session = new ExportSession(store, state);
    expect(run(changed, session)).toEqual(plain);
    expect(session.aborted).toBe(false);
  });

  it('should re-export what uses a changed alias', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const changed = {
      ...FILES,
      'aliases.fsh': FILES['aliases.fsh'].replace(
        'http://snomed.info/sct',
        'http://example.org/sct'
      )
    };
    const plain = run(changed);
    const session = new ExportSession(store, state);
    expect(run(changed, session)).toEqual(plain);
    expect(session.aborted).toBe(false);
  });

  it('should handle added, removed, and renamed entities', () => {
    const store = new MemoryStore();
    let state = record(FILES, store);
    const steps = [
      {
        ...FILES,
        'added.fsh': 'Instance: Added\nInstanceOf: MyPatient\n* name.family = "Added"\n'
      },
      {
        ...FILES,
        'instances.fsh': FILES['instances.fsh'].replace(/Instance: Child[^]*?(?=Instance: Bad)/, '')
      },
      {
        ...FILES,
        'profiles.fsh': FILES['profiles.fsh'].replace(/MyChildPatient/g, 'RenamedChild'),
        'instances.fsh': FILES['instances.fsh'].replace(/MyChildPatient/g, 'RenamedChild')
      }
    ];
    for (const files of steps) {
      const plain = run(files);
      const session = new ExportSession(store, state);
      expect(run(files, session)).toEqual(plain);
      expect(session.aborted).toBe(false);
      state = session.getState();
    }
  });

  it('should reproduce errors when a syntax error is introduced and fixed', () => {
    const store = new MemoryStore();
    let state = record(FILES, store);
    const broken = {
      ...FILES,
      'profiles.fsh': FILES['profiles.fsh'].replace('* name 1..*', '* = = BROKEN')
    };
    for (const files of [broken, FILES]) {
      const plain = run(files);
      const session = new ExportSession(store, state);
      expect(run(files, session)).toEqual(plain);
      state = session.getState();
    }
  });

  it('should export instances of a profile whose cached definition another instance changed', () => {
    const files: Record<string, string> = {
      ...FILES,
      'more.fsh': `
Instance: Pat2
InstanceOf: MyPatient
* name.family = "Ann"

Instance: Pat3
InstanceOf: MyPatient
* name.family = "Third"
* gender = #male
`
    };
    const store = new MemoryStore();
    let state = record(files, store);
    const edits = [
      { ...files, 'instances.fsh': files['instances.fsh'].replace('"Smith"', '"Jones"') },
      { ...files, 'more.fsh': files['more.fsh'].replace('"Third"', '"3rd"') },
      files
    ];
    for (const edited of edits) {
      const plain = run(edited);
      const session = new ExportSession(store, state);
      expect(run(edited, session)).toEqual(plain);
      expect(session.aborted).toBe(false);
      expect(session.stats.replayed).toBeGreaterThan(0);
      state = session.getState();
    }
  });

  it('should export normally when a cached result cannot be read', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    store.failReads = true;
    const plain = run(FILES);
    const session = new ExportSession(store, state);
    expect(run(FILES, session)).toEqual(plain);
    expect(session.stats.replayed).toBe(0);
    expect(session.stats.reasons['cache read failed']).toBeGreaterThan(0);
  });

  it('should not replay anything from a state marked unstable', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const session = new ExportSession(store, { ...state, unstable: true });
    expect(run(FILES, session)).toEqual(run(FILES));
    expect(session.stats.replayed).toBe(0);
  });

  it('should not replay entities that were recorded as not reusable', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    for (const rec of Object.values(state.records)) {
      rec.ok = false;
      rec.why = 'test';
    }
    const session = new ExportSession(store, state);
    expect(run(FILES, session)).toEqual(run(FILES));
    expect(session.stats.replayed).toBe(0);
    expect(session.stats.reasons['not reusable: test']).toBeGreaterThan(0);
  });

  it('should abort and discard its logs when a replay turns out to be wrong', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    // Pretend the profile read a different set of package entries when it was recorded
    const rec = state.records['Profile:MyChildPatient'];
    rec.script = rec.script.map(ev =>
      ev[0] === 'R' ? ['R', ev[1], ev[2], [...ev[3], 'Profile:Nope']] : ev
    ) as any;
    const session = new ExportSession(store, state);
    run(FILES, session);
    // MyChildPatient is exported (live) because the planned check fails before replaying
    expect(session.stats.reasons['package lookup differs']).toBeGreaterThan(0);
  });

  it('should replay nested exports of profiles and of instances assigned in caret rules', () => {
    const files = {
      ...FILES,
      'nested.fsh': `
Profile: EarlyChild
Parent: LateParent

CodeSystem: ContactCS
* ^contact[0] = Contact
* #x "X"

Profile: LateParent
Parent: Patient
* gender 1..1

Instance: Contact
InstanceOf: ContactDetail
Usage: #inline
* name = "Someone"
* telecom[0] = Phone

Instance: Phone
InstanceOf: ContactPoint
Usage: #inline
* system = #phone
* value = "555"
`
    };
    const store = new MemoryStore();
    const state = record(files, store);
    const refs = Object.values(state.records).flatMap(rec =>
      rec.script.filter(ev => ev[0] === 'T').map(ev => ev[2])
    );
    expect(refs).toEqual(expect.arrayContaining(['top', 'same', 'new#0']));
    const plain = run(files);
    const session = new ExportSession(store, state);
    expect(run(files, session)).toEqual(plain);
    expect(session.aborted).toBe(false);
    expect(session.stats.replayed).toBeGreaterThan(5);
  });

  function exportWith(files: Record<string, string>, session: ExportSession): Package {
    const docs = importText(Object.entries(files).map(([path, text]) => new RawFSH(text, path)));
    incrementalHooks.session = session;
    try {
      return exportFHIR(new FSHTank(docs, minimalConfig), defs);
    } finally {
      incrementalHooks.session = null;
    }
  }

  it('should replay the messages from checking the null values of a replayed profile', () => {
    const store = new MemoryStore();
    const recorder = new ExportSession(store, null);
    const recorded = exportWith(FILES, recorder);
    loggerSpy.reset();
    const profile = recorded.profiles.find(sd => sd.name === 'MyPatient');
    // also when the logger is already captured, as it is restored afterwards
    captureLogs(
      () => recorder.checkNullValues(profile, () => logger.warn('null in profile')),
      false
    );
    recorder.checkNullValues(recorded.instances[0], () => logger.warn('null in instance'));
    expect(loggerSpy.getAllMessages('warn')).toEqual(['null in profile', 'null in instance']);

    const replayer = new ExportSession(store, recorder.getState());
    const replayed = exportWith(FILES, replayer);
    expect(replayer.stats.replayed).toBeGreaterThan(0);
    loggerSpy.reset();
    const standIn = replayed.profiles.find(sd => sd.name === 'MyPatient');
    replayer.checkNullValues(standIn, () => logger.warn('checked again'));
    expect(loggerSpy.getAllMessages('warn')).toEqual(['null in profile']);
  });

  it('should not reuse a profile whose null value check logs something it cannot record', () => {
    const store = new MemoryStore();
    const recorder = new ExportSession(store, null);
    const recorded = exportWith(FILES, recorder);
    const profile = recorded.profiles.find(sd => sd.name === 'MyPatient');
    recorder.checkNullValues(profile, () => logger.warn(new Error('not plain data') as any));
    expect(recorder.getState().records['Profile:MyPatient'].ok).toBe(false);
  });

  describe('when something changes outside its export', () => {
    let spy: jest.SpyInstance = null;

    afterEach(() => {
      spy?.mockRestore();
      spy = null;
    });

    function changeAfterInstances(change: (exporter: any) => void) {
      const original = InstanceExporter.prototype.export;
      spy = jest.spyOn(InstanceExporter.prototype, 'export').mockImplementation(function () {
        const result = original.call(this);
        change(this);
        return result;
      });
    }

    const cases: [string, (exporter: any) => void][] = [
      ['identity changed', exporter => (exporter.tank.fish('MyVS').id = 'changed-id')],
      [
        'definition changed outside export',
        exporter => (exporter.tank.fish('MyVS').title = 'Changed')
      ],
      ['changed after export', exporter => (exporter.pkg.valueSets[0].title = 'Changed')]
    ];

    it.each(cases)('should not reuse a ValueSet whose %s, and abort a replay', (why, change) => {
      const store = new MemoryStore();
      const state = record(FILES, store);
      changeAfterInstances(change);
      const recorder = new ExportSession(store, null);
      run(FILES, recorder);
      expect(recorder.getState().records['FshValueSet:MyVS']).toMatchObject({ ok: false, why });
      const session = new ExportSession(store, state);
      run(FILES, session);
      expect(session.aborted).toBe(true);
    });
  });

  it('should abort a replay when a nested export it replays fails', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const original = InstanceExporter.prototype.exportInstance;
    const spy = jest
      .spyOn(InstanceExporter.prototype, 'exportInstance')
      .mockImplementation(function (fshDefinition) {
        if (fshDefinition.name === 'InlinePat') {
          throw new Error('boom');
        }
        return original.call(this, fshDefinition);
      });
    try {
      const session = new ExportSession(store, state);
      run(FILES, session);
      expect(session.aborted).toBe(true);
      expect(session.abortReason).toMatch(/nested export of Instance:InlinePat .*it threw: boom/);
    } finally {
      spy.mockRestore();
    }
  });

  it('should abort a replay when the result of an export cannot be restored', () => {
    const store = new MemoryStore();
    const state = record(FILES, store);
    const rec = Object.values(state.records).find(rec => rec.afterRef != null);
    store.payloads.delete(rec.afterRef);
    const session = new ExportSession(store, state);
    run(FILES, session);
    expect(session.aborted).toBe(true);
    expect(session.abortReason).toMatch(/^could not restore /);
    expect(store.readFailures).toBe(1);
  });

  describe('when an export cannot be recorded', () => {
    let spy: jest.SpyInstance = null;

    afterEach(() => {
      spy?.mockRestore();
      spy = null;
    });

    const cases: [string, () => void][] = [
      [
        'unrecordable log',
        () => {
          const original = (InstanceExporter.prototype as any).exportNewInstance;
          spy = jest
            .spyOn(InstanceExporter.prototype as any, 'exportNewInstance')
            .mockImplementation(function (fshDefinition: any) {
              if (fshDefinition.name === 'Pat') {
                logger.warn(new Error('not plain data') as any);
              }
              return original.call(this, fshDefinition);
            });
        }
      ],
      [
        'found an untracked package object',
        () => {
          // a copy of MyPatient that no export made, found by looking up MyPatient
          const original = CodeSystemExporter.prototype.export;
          spy = jest.spyOn(CodeSystemExporter.prototype, 'export').mockImplementation(function () {
            const result = original.call(this);
            const myPatient = this.pkg.profiles.find((sd: any) => sd.name === 'MyPatient');
            this.pkg.profiles.push(StructureDefinition.fromJSON(myPatient.toJSON()));
            return result;
          });
        }
      ]
    ];

    it.each(cases)('should not reuse an export that %s', (why, setUp) => {
      setUp();
      const store = new MemoryStore();
      const state = record(FILES, store);
      expect(state.records['Instance:Pat']).toMatchObject({ ok: false, why });
      const plain = run(FILES);
      const session = new ExportSession(store, state);
      expect(run(FILES, session)).toEqual(plain);
      expect(session.aborted).toBe(false);
      expect(session.stats.exportedBecause['Instance:Pat']).toBe(`not reusable: ${why}`);
    });
  });

  describe('when the recorded state does not match', () => {
    const cases: [string, (state: ExportState) => void][] = [
      ['unexpected state', state => (state.records['Profile:MyPatient'].kind = 'vs')],
      [
        'nothing recorded',
        state => {
          state.records['Profile:MyPatient'].script = [];
          delete state.records['Profile:MyPatient'].payloadRef;
        }
      ],
      ['missing result', state => delete state.records['Profile:MyPatient'].payloadRef],
      ['stand-in differs', state => (state.records['Profile:MyPatient'].sdProps = '[]')],
      [
        'alias differs',
        state => {
          const ev = state.records['Profile:MyPatient'].script.find(ev => ev[0] === 'A');
          ev[2] = 'http://example.org/changed';
        }
      ],
      [
        'tank lookup differs',
        state => {
          const ev = state.records['Profile:MyObservation'].script.find(
            ev => ev[0] === 'Q' && ev[1] === 'md'
          );
          ev[ev.length - 1] = 'changed';
        }
      ],
      [
        'tank lookup state differs',
        state => {
          const ev = state.records['Profile:MyObservation'].script.find(
            ev => ev[0] === 'Q' && ev[4].length > 0
          );
          ev[5] = ev[5].map(() => 'd');
        }
      ],
      [
        'unknown exporter',
        state => (state.records['Instance:Obs'].script.find(ev => ev[0] === 'T')[2] = 'other')
      ],
      [
        'nested export not reusable',
        state => (state.records['Instance:Obs'].script.find(ev => ev[0] === 'T')[4] = ['Nope'])
      ],
      [
        'nested export already done',
        state =>
          (state.records['Instance:Obs'].script.find(ev => ev[0] === 'T')[4] = ['Instance:Pat'])
      ],
      [
        'nested export missing',
        state =>
          (state.records['Instance:Obs'].script.find(ev => ev[0] === 'T')[1] = 'Instance:Nope')
      ]
    ];

    it.each(cases)('should export normally, counting %s', (reason, tamper) => {
      const store = new MemoryStore();
      const state = record(FILES, store);
      tamper(state);
      const session = new ExportSession(store, state);
      expect(run(FILES, session)).toEqual(run(FILES));
      expect(session.stats.reasons[reason]).toBeGreaterThan(0);
    });
  });
});
