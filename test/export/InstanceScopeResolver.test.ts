import { cloneDeep } from 'lodash';
import { InMemoryVirtualPackage } from 'fhir-package-loader';
import { Instance, Profile, RuleSet } from '../../src/fshtypes';
import { CaretValueRule, InsertRule } from '../../src/fshtypes/rules';
import { FSHDocument, FSHTank } from '../../src/import';
import { InstanceExporter, Package } from '../../src/export';
import { StructureDefinition } from '../../src/fhirtypes';
import { applyInsertRules } from '../../src/fhirtypes/common';
import {
  PREDEFINED_PACKAGE_NAME,
  PREDEFINED_PACKAGE_VERSION,
  VERSION_SCOPE_EXTENSION,
  VersionScopes
} from '../../src/ig';
import { FishingDiagnostic, Type } from '../../src/utils/Fishable';
import { stats } from '../../src/utils/FSHLogger';
import {
  INSTANCE_OF_TYPES,
  assertInstanceScopeDefinition,
  reportInstanceScopeDiagnostics,
  resolveInstanceScope
} from '../../src/export/InstanceScopeResolver';
import { AmbiguousInstanceVersionScopeError } from '../../src/errors/AmbiguousInstanceVersionScopeError';
import { InstanceOfNotDefinedError } from '../../src/errors/InstanceOfNotDefinedError';
import { getTestFHIRDefinitions, loggerSpy, testDefsPath, TestFisher } from '../testhelpers';
import { minimalConfig } from '../utils/minimalConfig';

describe('InstanceScopeResolver', () => {
  const url = 'http://example.org/StructureDefinition/scoped-base';
  const patient = { version: 'r4', value: 'Patient/shared' };
  const observation = { version: 'r4b', value: 'Observation/shared' };
  const extensionFor = (version: string) => ({
    url: VERSION_SCOPE_EXTENSION,
    extension: [{ url: 'fhirVersion', valueCode: version }]
  });
  type Definition = {
    type?: string;
    target: string;
    url?: string;
    version?: string;
  };
  const setup = async (
    entries = [patient, observation],
    definitions: Definition[] = [
      { type: 'Patient', target: 'r4' },
      { type: 'Observation', target: 'r4b' }
    ]
  ) => {
    const config = cloneDeep(minimalConfig);
    config.canonical = 'http://example.org';
    config.fhirVersion = ['5.0.0'];
    config.parameters = [
      { code: 'generate-version', value: 'r4' },
      { code: 'generate-version', value: 'r4b' },
      ...entries.map(entry => ({ code: `${entry.version}-inclusion`, value: entry.value }))
    ];
    config.dependencies = [
      { packageId: 'example.anchor', version: '1.0.0', extension: [extensionFor('r4')] },
      ...definitions.map((definition, index) => ({
        packageId: `example.scope.${index}`,
        version: '1.0.0',
        extension: [extensionFor(definition.target)]
      }))
    ];
    const defs = await getTestFHIRDefinitions(true, testDefsPath('r4-definitions'));
    for (const [index, definition] of definitions.entries()) {
      await defs.loadVirtualPackage(
        new InMemoryVirtualPackage(
          { name: `example.scope.${index}`, version: '1.0.0' },
          new Map([
            [
              `profile-${index}`,
              {
                resourceType: 'StructureDefinition',
                id: `profile-${index}`,
                name: 'ScopedBase',
                url: definition.url ?? url,
                version: definition.version ?? '1.0.0',
                kind: definition.type === 'Extension' ? 'complex-type' : 'resource',
                derivation: 'constraint',
                type: definition.type,
                baseDefinition: `http://hl7.org/fhir/StructureDefinition/${definition.type}`
              }
            ]
          ])
        )
      );
    }
    const scopes = new VersionScopes(config);
    defs.setVersionScopes(scopes);
    const doc = new FSHDocument('instances.fsh');
    const tank = new FSHTank([doc], config);
    const pkg = new Package(config);
    const fisher = new TestFisher(tank, defs, pkg);
    const instance = new Instance('Example').withFile('instances.fsh').withLocation([4, 1, 7, 12]);
    instance.id = 'shared';
    instance.instanceOf = 'ScopedBase';
    doc.instances.set(instance.name, instance);
    loggerSpy.reset();
    return { config, defs, scopes, doc, tank, pkg, fisher, instance };
  };
  const caught = (fn: () => unknown): unknown => {
    try {
      fn();
    } catch (error) {
      return error;
    }
    throw new Error('Expected the operation to throw');
  };

  it('resolves by sdType rather than StructureDefinition resourceType and probes each distinct alternative once', async () => {
    const { instance, fisher, scopes, pkg, tank } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }]
    );
    const exporter = new InstanceExporter(tank, pkg, fisher);
    const rulesBefore = cloneDeep(instance.rules);
    const metadata = jest.spyOn(fisher, 'fishForMetadata');
    const json = jest.spyOn(fisher, 'fishForFHIR');
    const deserialize = jest.spyOn(StructureDefinition, 'fromJSON');
    try {
      const result = resolveInstanceScope(instance, fisher, scopes);
      expect(result.versions).toEqual(['r4']);
      expect(result.metadata).toMatchObject({
        sdType: 'Patient',
        resourceType: 'StructureDefinition'
      });
      expect(result.key).toEqual({ id: 'shared' });
      expect(metadata).toHaveBeenCalledTimes(2);
      for (const call of metadata.mock.calls) {
        expect(call).toEqual(['ScopedBase', ...INSTANCE_OF_TYPES]);
      }
      expect(json).not.toHaveBeenCalled();
      expect(deserialize).not.toHaveBeenCalled();
      expect(pkg.instances).toEqual([]);
      expect(pkg.fshMap.size).toBe(0);
      expect(exporter.sdCache.size).toBe(0);
      expect(instance.rules).toEqual(rulesBefore);
    } finally {
      metadata.mockRestore();
      json.mockRestore();
      deserialize.mockRestore();
    }
  });

  it('rejects two consistent listed identities with actionable inclusion and source evidence', async () => {
    const { instance, fisher, scopes, pkg } = await setup();
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({
      sourceInfo: instance.sourceInfo,
      message: expect.stringContaining('Multiple version memberships are consistent')
    });
    for (const text of [
      'Example',
      'shared',
      'ScopedBase',
      'Patient/shared',
      'Observation/shared',
      'r4-inclusion',
      'r4b-inclusion',
      url,
      'Align InstanceOf'
    ]) {
      expect(error).toMatchObject({ message: expect.stringContaining(text) });
    }
    expect(pkg.instances).toHaveLength(0);
  });

  it('rejects a consistent unlisted identity even when only one type prefix is listed', async () => {
    const { instance, fisher, scopes } = await setup([patient]);
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({
      message: expect.stringContaining('unlisted: all target versions'),
      sourceInfo: instance.sourceInfo
    });
    expect(error).toMatchObject({ message: expect.stringContaining('type Observation') });
  });

  it('allows different identities with the same membership', async () => {
    const { instance, fisher, scopes } = await setup([
      patient,
      { version: 'r4', value: 'Observation/shared' }
    ]);
    expect(resolveInstanceScope(instance, fisher, scopes)).toMatchObject({
      versions: ['r4'],
      metadata: { sdType: 'Patient' }
    });
  });

  it('rejects a circular choice with no consistent fixed point', async () => {
    const { instance, fisher, scopes } = await setup(
      [patient],
      [
        { type: 'Observation', target: 'r4' },
        { type: 'Patient', target: 'r4b' }
      ]
    );
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({
      message: expect.stringContaining('No consistent membership exists')
    });
  });

  it('does not discard an unresolved competing definition', async () => {
    const { instance, fisher, scopes } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }, { target: 'r4b' }]
    );
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({
      message: expect.stringContaining('missing or incomplete InstanceOf metadata')
    });
  });

  it('does not treat one missing provider result as proof against that membership', async () => {
    const { instance, fisher, scopes } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }]
    );
    const original = fisher.fishForMetadata.bind(fisher);
    const metadata = jest
      .spyOn(fisher, 'fishForMetadata')
      .mockImplementationOnce(original)
      .mockReturnValueOnce(undefined);
    try {
      expect(caught(() => resolveInstanceScope(instance, fisher, scopes))).toBeInstanceOf(
        AmbiguousInstanceVersionScopeError
      );
    } finally {
      metadata.mockRestore();
    }
  });

  it('keeps the original missing-InstanceOf error when every alternative is missing', async () => {
    const { instance, fisher, scopes } = await setup([], []);
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(InstanceOfNotDefinedError);
    expect(error).toMatchObject({
      instanceName: 'Example',
      instanceOf: 'ScopedBase',
      sourceInfo: instance.sourceInfo
    });
  });

  it('uses one all-target probe when no inclusion matches', async () => {
    const { instance, fisher, scopes } = await setup([]);
    const metadata = jest.spyOn(fisher, 'fishForMetadata');
    try {
      expect(resolveInstanceScope(instance, fisher, scopes).versions).toEqual(['r5', 'r4', 'r4b']);
      expect(metadata).toHaveBeenCalledTimes(1);
    } finally {
      metadata.mockRestore();
    }
  });

  it('bounds probes by distinct memberships rather than repeated entries or type prefixes', async () => {
    const { instance, fisher, scopes } = await setup(
      [
        patient,
        patient,
        { version: 'r4', value: 'Observation/shared' },
        { version: 'r4', value: 'Encounter/shared' }
      ],
      [{ type: 'Patient', target: 'r4' }]
    );
    const metadata = jest.spyOn(fisher, 'fishForMetadata');
    try {
      expect(resolveInstanceScope(instance, fisher, scopes).versions).toEqual(['r4']);
      expect(metadata).toHaveBeenCalledTimes(2);
    } finally {
      metadata.mockRestore();
    }
  });

  it('retains alias and version-qualified resolution through MasterFisher', async () => {
    const { instance, fisher, scopes, doc } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }]
    );
    doc.aliases.set('PinnedAlias', `${url}|1.0.0`);
    instance.instanceOf = 'PinnedAlias';
    expect(resolveInstanceScope(instance, fisher, scopes)).toMatchObject({
      versions: ['r4'],
      metadata: { sdType: 'Patient', url, version: '1.0.0' }
    });
  });

  it('preserves package, tank, and predefined provider precedence without a declaration census', async () => {
    const { instance, fisher, scopes, doc, pkg, defs } = await setup();
    const local = new Profile('ScopedBase');
    local.parent = 'Patient';
    local.id = 'tank-profile';
    doc.profiles.set(local.name, local);
    expect(resolveInstanceScope(instance, fisher, scopes).metadata.url).toBe(
      'http://example.org/StructureDefinition/tank-profile'
    );

    const output = StructureDefinition.fromJSON(defs.fishForFHIR('Observation', Type.Resource));
    output.name = 'ScopedBase';
    output.id = 'output-profile';
    output.url = 'http://example.org/StructureDefinition/output-profile';
    output.derivation = 'constraint';
    pkg.profiles.push(output);
    expect(resolveInstanceScope(instance, fisher, scopes)).toMatchObject({
      versions: ['r4b'],
      metadata: { url: output.url, sdType: 'Observation' }
    });

    const predefined = cloneDeep(defs.fishForFHIR('Patient', Type.Resource));
    predefined.name = 'ScopedBase';
    predefined.id = 'predefined-profile';
    predefined.url = 'http://example.org/StructureDefinition/predefined-profile';
    await defs.loadVirtualPackage(
      new InMemoryVirtualPackage(
        { name: PREDEFINED_PACKAGE_NAME, version: PREDEFINED_PACKAGE_VERSION },
        new Map([[predefined.id, predefined]])
      )
    );
    expect(resolveInstanceScope(instance, fisher, scopes)).toMatchObject({
      versions: ['r4'],
      metadata: { url: predefined.url, sdType: 'Patient' }
    });
  });

  it.each([
    ['SearchParameter', 'SearchParameter'],
    ['http://other.org/StructureDefinition/Shape', 'Shape']
  ])(
    'retains project-canonical membership for %s without manufacturing a key URL',
    async (type, pathType) => {
      const { instance, fisher, scopes } = await setup(
        [{ version: 'r4', value: `http://example.org/${pathType}/shared` }],
        [{ type, target: 'r4' }]
      );
      const result = resolveInstanceScope(instance, fisher, scopes);
      expect(result.versions).toEqual(['r4']);
      expect(result.key).toEqual({ id: 'shared' });
    }
  );

  it('allows ordinary insert-rule preparation without further rule or source changes between probes', async () => {
    const { instance, fisher, scopes, doc, tank } = await setup([patient]);
    const local = new Profile('LocalParent');
    local.parent = 'Patient';
    const rules = new RuleSet('MetadataRules');
    const urlRule = new CaretValueRule('').withFile('rules.fsh').withLocation([1, 1, 1, 20]);
    urlRule.caretPath = 'url';
    urlRule.value = 'http://example.org/inserted-profile';
    rules.rules.push(urlRule);
    doc.ruleSets.set(rules.name, rules);
    const insert = new InsertRule('').withFile('profiles.fsh').withLocation([3, 1, 3, 20]);
    insert.ruleSet = rules.name;
    local.rules.push(insert);
    doc.profiles.set(local.name, local);
    instance.instanceOf = local.name;
    applyInsertRules(local, tank);
    const prepared = cloneDeep([instance, local, rules]);

    expect(resolveInstanceScope(instance, fisher, scopes)).toMatchObject({
      versions: ['r4'],
      metadata: { url: urlRule.value }
    });
    expect([instance, local, rules]).toEqual(prepared);
    expect(loggerSpy.getAllMessages()).toHaveLength(0);
  });

  it('does not silence normal insert-rule diagnostics during metadata preparation', async () => {
    const { instance, fisher, scopes, doc } = await setup([patient]);
    const local = new Profile('LocalParent');
    local.parent = 'Patient';
    const insert = new InsertRule('').withFile('profiles.fsh').withLocation([2, 1, 2, 10]);
    insert.ruleSet = 'MissingRules';
    local.rules.push(insert);
    doc.profiles.set(local.name, local);
    instance.instanceOf = local.name;

    expect(resolveInstanceScope(instance, fisher, scopes).versions).toEqual(['r4']);
    expect(loggerSpy.getAllMessages('error')).toEqual([
      expect.stringContaining('Unable to find definition for RuleSet MissingRules.')
    ]);
  });

  it('retains a repeated parent-cycle diagnostic once with its original full source', async () => {
    const { instance, fisher, scopes, doc } = await setup();
    const cycle = new Profile('Cycle')
      .withFile('cycle.fsh')
      .withLocation([2, 1, 4, 9])
      .withAppliedFile('applied.fsh')
      .withAppliedLocation([8, 1, 8, 12]);
    cycle.parent = 'Cycle';
    doc.profiles.set(cycle.name, cycle);
    instance.instanceOf = cycle.name;
    const diagnostics: FishingDiagnostic[] = [];
    const error = fisher.withFishingDiagnostics(diagnostics, () =>
      caught(() => resolveInstanceScope(instance, fisher, scopes))
    );

    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({ sourceInfo: instance.sourceInfo });
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        message: expect.stringContaining('Circular dependency detected'),
        sourceInfo: cycle.sourceInfo
      }
    ]);
    expect(loggerSpy.getAllMessages()).toHaveLength(0);
  });

  it('carries only selected probe diagnostics forward and leaves their emission to actual acquisition', async () => {
    const { instance, fisher, scopes } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }]
    );
    const original = fisher.fishForMetadata.bind(fisher);
    let probe = 0;
    const metadata = jest.spyOn(fisher, 'fishForMetadata').mockImplementation((item, ...types) => {
      fisher.reportFishingDiagnostic({
        severity: 'warn',
        message: `probe ${probe++}`,
        sourceInfo: instance.sourceInfo
      });
      return original(item, ...types);
    });
    try {
      const result = resolveInstanceScope(instance, fisher, scopes);
      expect(result.diagnostics).toEqual([
        { severity: 'warn', message: 'probe 0', sourceInfo: instance.sourceInfo }
      ]);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
      reportInstanceScopeDiagnostics(fisher, result.diagnostics);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toContain('probe 0');
      expect(loggerSpy.getLastMessage('warn')).not.toContain('probe 1');
    } finally {
      metadata.mockRestore();
    }
  });

  it('deduplicates correction messages across selected metadata and JSON acquisition', async () => {
    const corrected = 'http://hl7.org/fhir/5.0/StructureDefinition/extension-Patient.example';
    const { instance, fisher, scopes } = await setup(
      [{ version: 'r4', value: 'Extension/shared' }],
      [{ type: 'Extension', target: 'r4', url: corrected }]
    );
    instance.instanceOf = `${corrected}[x]`;
    const warningsBefore = stats.numWarn;
    const result = resolveInstanceScope(instance, fisher, scopes);
    const diagnostics = [...result.diagnostics];
    expect(stats.numWarn).toBe(warningsBefore);
    fisher.withFishingDiagnostics(diagnostics, () =>
      fisher.inVersionScope(result.versions, () =>
        fisher.fishForFHIR(instance.instanceOf, ...INSTANCE_OF_TYPES)
      )
    );
    reportInstanceScopeDiagnostics(fisher, diagnostics);
    expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
    expect(stats.numWarn).toBe(warningsBefore + 1);
  });

  it('retains distinct missing cross-version diagnostics once before the missing-InstanceOf failure', async () => {
    const { instance, fisher, scopes } = await setup();
    instance.instanceOf = 'http://hl7.org/fhir/5.0/StructureDefinition/extension-Patient.absent[x]';
    const error = caught(() => resolveInstanceScope(instance, fisher, scopes));
    expect(error).toBeInstanceOf(InstanceOfNotDefinedError);
    expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
    expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('error')).toContain(
      'requires the cross-version extension package'
    );
  });

  it('restores the outer frame and sink and preserves diagnostics on unexpected exceptions', async () => {
    const { instance, fisher, scopes, defs } = await setup();
    const thrown = new Error('Unexpected provider failure');
    const metadata = jest.spyOn(fisher, 'fishForMetadata').mockImplementationOnce(() => {
      fisher.reportFishingDiagnostic({
        severity: 'error',
        message: 'provider detail',
        sourceInfo: instance.sourceInfo
      });
      throw thrown;
    });
    const outer: FishingDiagnostic[] = [];
    try {
      fisher.inVersionScope(['r4'], () => {
        fisher.withFishingDiagnostics(outer, () => {
          expect(caught(() => resolveInstanceScope(instance, fisher, scopes))).toBe(thrown);
          expect(thrown).toMatchObject({ sourceInfo: instance.sourceInfo });
          fisher.reportFishingDiagnostic({ severity: 'warn', message: 'after failure' });
        });
        expect(defs.fishForMetadata('ScopedBase').sdType).toBe('Patient');
      });
      expect(outer.map(diagnostic => diagnostic.message)).toEqual([
        'provider detail',
        'after failure'
      ]);
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
      fisher.reportFishingDiagnostic({ severity: 'warn', message: 'ordinary warning' });
      expect(loggerSpy.getLastMessage('warn')).toBe('ordinary warning');
    } finally {
      metadata.mockRestore();
    }
  });

  it('deduplicates using full source information rather than only file or line', async () => {
    const { fisher } = await setup();
    const diagnostic: FishingDiagnostic = {
      severity: 'warn',
      message: 'same message',
      sourceInfo: {
        file: 'source.fsh',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        appliedFile: 'applied.fsh',
        appliedLocation: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 10 }
      }
    };
    const different = cloneDeep(diagnostic);
    different.sourceInfo.appliedLocation.endColumn = 20;
    const captured: FishingDiagnostic[] = [];
    fisher.withFishingDiagnostics(captured, () =>
      reportInstanceScopeDiagnostics(fisher, [diagnostic, cloneDeep(diagnostic), different])
    );
    expect(captured).toEqual([diagnostic, different]);
  });

  it.each([
    { type: 'Observation', url, version: '1.0.0' },
    { type: 'Patient', url: 'http://other.org/definition', version: '1.0.0' },
    { type: 'Patient', url, version: '2.0.0' },
    { type: undefined, url, version: '1.0.0' },
    { type: 'Patient', url: undefined, version: '1.0.0' }
  ])('rejects consumed-definition disagreement: %j', async definition => {
    const { instance, fisher, scopes } = await setup(
      [patient],
      [{ type: 'Patient', target: 'r4' }]
    );
    const resolved = resolveInstanceScope(instance, fisher, scopes);
    const error = caught(() =>
      assertInstanceScopeDefinition(instance, resolved, definition, scopes)
    );
    expect(error).toBeInstanceOf(AmbiguousInstanceVersionScopeError);
    expect(error).toMatchObject({
      sourceInfo: instance.sourceInfo,
      message: expect.stringContaining('consumed InstanceOf definition disagrees')
    });
    expect(error).toMatchObject({ message: expect.stringContaining('Expected type Patient') });
    expect(error).toMatchObject({ message: expect.stringContaining('Actual type') });
  });
});
