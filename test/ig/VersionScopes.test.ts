import { Configuration } from '../../src/fshtypes';
import { VERSION_SCOPE_EXTENSION, VersionScopes, normalizeVersionToken } from '../../src/ig';

describe('VersionScopes', () => {
  const baseConfig = (): Configuration =>
    ({
      canonical: 'http://example.org',
      fhirVersion: ['5.0.0'],
      parameters: [
        { code: 'generate-version', value: 'r4' },
        { code: 'generate-version', value: '4.3.0' }
      ],
      dependencies: []
    }) as Configuration;

  const versionExtension = (
    fhirVersion: string,
    options: { packageId?: string; version?: string; use?: string } = {}
  ) => ({
    url: VERSION_SCOPE_EXTENSION,
    extension: [
      { url: 'fhirVersion', valueCode: fhirVersion },
      options.packageId ? { url: 'packageId', valueId: options.packageId } : null,
      options.version ? { url: 'version', valueString: options.version } : null,
      options.use ? { url: 'use', valueCode: options.use } : null
    ].filter(Boolean)
  });

  it('derives target version tokens from fhirVersion and generate-version parameters', () => {
    const scopes = new VersionScopes(baseConfig());

    expect(scopes.targetVersions).toEqual(['r5', 'r4', 'r4b']);
  });

  it('accepts every version token in the Publisher family table', () => {
    // '5.0' is not listed in the Publisher's table, but is accepted for symmetry with R4 and R4B.
    expect(['r4', 'R4', '4.0', '4.0.1'].map(normalizeVersionToken)).toEqual([
      'r4',
      'r4',
      'r4',
      'r4'
    ]);
    expect(['r4b', 'R4B', '4.3', '4.3.0'].map(normalizeVersionToken)).toEqual([
      'r4b',
      'r4b',
      'r4b',
      'r4b'
    ]);
    expect(['r5', 'R5', '5.0', '5.0.0'].map(normalizeVersionToken)).toEqual([
      'r5',
      'r5',
      'r5',
      'r5'
    ]);
  });

  it('rejects version tokens outside the Publisher family table', () => {
    // Guards the closed allow-list: a generic <major>.<minor> rule would resolve '4.2' to R5 and
    // silently accept the rest as targets.
    expect(['4.1', '4.2', '6.0', '3.0', 'banana'].map(normalizeVersionToken)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ]);
  });

  it('derives target versions from two-part family tokens', () => {
    const config = baseConfig();
    config.parameters = [
      { code: 'generate-version', value: '4.0' },
      { code: '4.0-inclusion', value: 'StructureDefinition/only-r4' }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.targetVersions).toEqual(['r5', 'r4']);
    expect(
      scopes.versionsForArtifact({ resourceType: 'StructureDefinition', id: 'only-r4' })
    ).toEqual(['r4']);
  });

  it('reads generate-version and inclusions from Coding parameter codes', () => {
    const config = baseConfig();
    config.parameters = [
      {
        code: {
          code: 'generate-version',
          system: 'http://hl7.org/fhir/tools/CodeSystem/ig-parameters'
        },
        value: 'r4'
      },
      { code: { code: 'r4-inclusion' }, value: 'StructureDefinition/only-legacy' }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.targetVersions).toEqual(['r5', 'r4']);
    expect(
      scopes.versionsForArtifact({ resourceType: 'StructureDefinition', id: 'only-legacy' })
    ).toEqual(['r4']);
  });

  it('reads a mix of string and Coding parameter codes in declaration order', () => {
    const config = baseConfig();
    config.parameters = [
      { code: 'generate-version', value: 'r4' },
      { code: { code: 'generate-version' }, value: 'r4b' }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.targetVersions).toEqual(['r5', 'r4', 'r4b']);
  });

  it('treats configs with no version-scoped dependency as unconfigured', () => {
    const config = baseConfig();
    config.dependencies = [{ packageId: 'hl7.fhir.uv.tools', version: '1.0.0' }];

    const scopes = new VersionScopes(config);

    expect(scopes.isConfigured()).toBe(false);
    expect(scopes.packageBandFor('r4', 'hl7.fhir.uv.tools', '1.0.0')).toBe('broad');
  });

  it('implements dependency override, remove, version-specific add, and legacy cases', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.xver',
        version: '1.0.0',
        extension: [
          versionExtension('r4', { packageId: 'example.xver.r4', version: '4.0.1' }),
          versionExtension('r4b', { use: 'remove' })
        ]
      },
      {
        packageId: 'example.r4.only',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      },
      { packageId: 'example.legacy', version: '1.0.0' }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.isConfigured()).toBe(true);
    expect(scopes.packageBandFor('r4', 'example.xver.r4', '4.0.1')).toBe('in-scope');
    expect(scopes.packageBandFor('r4b', 'example.xver.r4', '4.0.1')).toBe('out-of-version');
    expect(scopes.packageBandFor('r4', 'example.r4.only', '1.0.0')).toBe('in-scope');
    expect(scopes.packageBandFor('r5', 'example.r4.only', '1.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r4', 'example.legacy', '1.0.0')).toBe('broad');
  });

  it('does not infer version-specific package ids by suffix', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.package',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r4', 'example.package.r4', '1.0.0')).toBe('broad');
  });

  it('distinguishes package versions when only the version is overridden', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'my.dep',
        version: '1.0.0',
        extension: [versionExtension('r4'), versionExtension('r5', { version: '2.0.0' })]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r5', 'my.dep', '2.0.0')).toBe('in-scope');
    expect(scopes.packageBandFor('r4', 'my.dep', '2.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r4', 'my.dep', '1.0.0')).toBe('in-scope');
    expect(scopes.packageBandFor('r5', 'my.dep', '1.0.0')).toBe('out-of-version');
  });

  it('keeps an untagged package broad when a version-scoped dependency shares its id', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'my.dep',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r4', 'my.dep', '9.9.9')).toBe('broad');
  });

  it('matches a version-scoped dependency pinned to latest by package id', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'my.dep',
        version: 'latest',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r4', 'my.dep', '1.2.3')).toBe('in-scope');
    expect(scopes.packageBandFor('r5', 'my.dep', '1.2.3')).toBe('out-of-version');
  });

  it('matches inclusion membership by Type/id, bare id, and canonical URL', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.r4',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];
    config.parameters.push(
      { code: 'r4-inclusion', value: 'StructureDefinition/type-id' },
      { code: 'r4b-inclusion', value: 'bare-id' },
      { code: 'r5-inclusion', value: 'http://example.org/ValueSet/canonical-id' }
    );

    const scopes = new VersionScopes(config);

    expect(
      scopes.versionsForArtifact({ resourceType: 'StructureDefinition', id: 'type-id' })
    ).toEqual(['r4']);
    expect(scopes.versionsForArtifact({ resourceType: 'ValueSet', id: 'bare-id' })).toEqual([
      'r4b'
    ]);
    expect(
      scopes.versionsForArtifact({
        resourceType: 'ValueSet',
        id: 'canonical-id',
        url: 'http://example.org/ValueSet/canonical-id'
      })
    ).toEqual(['r5']);
    expect(scopes.versionsForArtifact({ resourceType: 'CodeSystem', id: 'unlisted' })).toEqual([
      'r5',
      'r4',
      'r4b'
    ]);
  });

  it('matches a Type/id inclusion entry for an artifact key with no resource type', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.r4',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];
    config.parameters.push({ code: 'r4-inclusion', value: 'SearchParameter/my-sp' });

    const scopes = new VersionScopes(config);

    expect(scopes.versionsForArtifact({ id: 'my-sp' })).toEqual(['r4']);
    // A key that names its own type must not match a different type's entry
    expect(scopes.versionsForArtifact({ resourceType: 'ValueSet', id: 'my-sp' })).toEqual([
      'r5',
      'r4',
      'r4b'
    ]);
  });

  it('reports unmatched inclusion entries and inconsistent type prefixes', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.r4',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];
    config.parameters.push(
      { code: 'r4-inclusion', value: 'StructureDefinition/shared' },
      { code: 'r4b-inclusion', value: 'ValueSet/shared' },
      { code: 'r5-inclusion', value: 'CodeSystem/missing' }
    );

    const scopes = new VersionScopes(config);

    expect(scopes.inconsistentTypePrefixes()).toEqual([
      {
        id: 'shared',
        entries: [
          { version: 'r4', value: 'StructureDefinition/shared' },
          { version: 'r4b', value: 'ValueSet/shared' }
        ]
      }
    ]);
    expect(
      scopes.diagnosticsForExportedArtifacts([
        { resourceType: 'StructureDefinition', id: 'shared' }
      ])
    ).toEqual([
      { version: 'r4b', value: 'ValueSet/shared' },
      { version: 'r5', value: 'CodeSystem/missing' }
    ]);
  });

  it('counts artifact memberships across configured target versions', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.r4',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];
    config.parameters.push(
      { code: 'r4-inclusion', value: 'StructureDefinition/r4-only' },
      { code: 'r4b-inclusion', value: 'ValueSet/r4b-only' }
    );

    const scopes = new VersionScopes(config);

    expect(
      scopes.artifactCounts([
        { resourceType: 'StructureDefinition', id: 'r4-only' },
        { resourceType: 'ValueSet', id: 'r4b-only' },
        { resourceType: 'CodeSystem', id: 'all' }
      ])
    ).toEqual({ r5: 1, r4: 2, r4b: 2 });
    expect(scopes.artifactCounts()).toEqual({ r5: 0, r4: 1, r4b: 1 });
  });

  it('reports an inclusion parameter that names a non-target version', () => {
    const config = baseConfig();
    config.parameters.push(
      { code: 'r6-inclusion', value: 'StructureDefinition/future' },
      // A Publisher-accepted long token is a correct configuration, not a diagnostic.
      { code: '4.0.1-inclusion', value: 'StructureDefinition/legacy' }
    );

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].severity).toBe('warn');
    expect(scopes.configurationIssues()[0].message).toMatch(/r6-inclusion/);
    expect(
      scopes.versionsForArtifact({ resourceType: 'StructureDefinition', id: 'future' })
    ).toEqual(['r5', 'r4', 'r4b']);
    expect(
      scopes.versionsForArtifact({ resourceType: 'StructureDefinition', id: 'legacy' })
    ).toEqual(['r4']);
  });

  it('reports an inclusion parameter whose value is not a string', () => {
    const config = baseConfig();
    config.parameters.push({ code: 'r4-inclusion' } as never);

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].severity).toBe('warn');
    expect(scopes.configurationIssues()[0].message).toMatch(/r4-inclusion/);
  });

  it('reports a generate-version parameter that is not a usable version token', () => {
    const config = baseConfig();
    config.parameters.push({ code: 'generate-version', value: 'banana' }, {
      code: 'generate-version',
      value: 5
    } as never);

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(2);
    expect(scopes.configurationIssues().map(issue => issue.severity)).toEqual(['warn', 'warn']);
    expect(scopes.targetVersions).toEqual(['r5', 'r4', 'r4b']);
  });

  it('reports a dependency occurrence with an invalid fhirVersion', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.mixed',
        version: '1.0.0',
        extension: [versionExtension('r4'), versionExtension('banana')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].severity).toBe('warn');
    expect(scopes.configurationIssues()[0].message).toMatch(/banana/);
    expect(scopes.packageBandFor('r4', 'example.mixed', '1.0.0')).toBe('in-scope');
    expect(scopes.packageBandFor('r5', 'example.mixed', '1.0.0')).toBe('out-of-version');
  });

  it('reports a dependency occurrence whose use is not override or remove', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.typo',
        version: '1.0.0',
        extension: [versionExtension('r4'), versionExtension('r4b', { use: 'remvoe' })]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].message).toMatch(/remvoe/);
    // The typo must not be applied as an override.
    expect(scopes.packageBandFor('r4b', 'example.typo', '1.0.0')).toBe('out-of-version');
  });

  it('reports a dependency occurrence for a version that is not a target', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.future',
        version: '1.0.0',
        extension: [versionExtension('r4'), versionExtension('r6')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].message).toMatch(/r6/);
  });

  it('does not widen a dependency whose version extensions all failed to parse', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.bad',
        version: '1.0.0',
        extension: [versionExtension('banana')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toHaveLength(1);
    expect(scopes.configurationIssues()[0].severity).toBe('error');
    expect(scopes.isConfigured()).toBe(true);
    expect(
      scopes.targetVersions.map(v => scopes.packageBandFor(v, 'example.bad', '1.0.0'))
    ).toEqual(['out-of-version', 'out-of-version', 'out-of-version']);
  });

  it('matches a project-canonical inclusion url for an artifact key with no resource type', () => {
    const config = baseConfig();
    config.parameters.push(
      { code: 'r4-inclusion', value: 'http://example.org/SearchParameter/my-sp' },
      { code: 'r4b-inclusion', value: 'http://other.org/SearchParameter/other-sp' }
    );

    const scopes = new VersionScopes(config);

    expect(scopes.versionsForArtifact({ id: 'my-sp' })).toEqual(['r4']);
    // A key that names its own type stays on exact matching.
    expect(scopes.versionsForArtifact({ resourceType: 'ValueSet', id: 'my-sp' })).toEqual([
      'r5',
      'r4',
      'r4b'
    ]);
    // Only this project's canonical is indexed typelessly.
    expect(scopes.versionsForArtifact({ id: 'other-sp' })).toEqual(['r5', 'r4', 'r4b']);
  });

  it('treats a patch-wildcard package version as non-concrete', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'my.dep',
        version: '1.2.x',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r4', 'my.dep', '1.2.9')).toBe('in-scope');
    expect(scopes.packageBandFor('r5', 'my.dep', '1.2.9')).toBe('out-of-version');
  });
});
