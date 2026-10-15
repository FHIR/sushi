import { Configuration } from '../../src/fshtypes';
import { ImplementationGuideDependsOn } from '../../src/fhirtypes';
import {
  VERSION_SCOPE_EXTENSION,
  VersionScopes,
  normalizeVersionToken,
  getEffectiveVersionDependencies,
  getVersionScopedPackages,
  matchesPackageSpec,
  EffectiveVersionDependency,
  PackageSpec
} from '../../src/ig';

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

  it('counts configured inclusion declarations, including repeats and zero counts', () => {
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
      { code: 'r4-inclusion', value: 'StructureDefinition/r4-only' },
      { code: 'r4b-inclusion', value: 'ValueSet/r4b-only' }
    );

    const scopes = new VersionScopes(config);

    expect(scopes.artifactCounts()).toEqual({ r5: 0, r4: 2, r4b: 1 });
    expect(Object.keys(scopes.artifactCounts())).toEqual(['r5', 'r4', 'r4b']);
  });

  it.each([
    ['r4', 'r4'],
    ['R4B', 'r4b'],
    ['r5', 'r5'],
    ['4.0', 'r4'],
    ['4.3', 'r4b'],
    ['5.0', 'r5'],
    ['4.0.1', 'r4'],
    ['4.3.0', 'r4b'],
    ['5.0.0', 'r5'],
    ['4.3.0-snapshot1', 'r4b'],
    ['5.0.0-ballot', 'r5']
  ])('recognizes %s inclusion parameters with string and Coding codes', (token, version) => {
    for (const code of [`${token}-inclusion`, { code: `${token}-inclusion` }]) {
      const config = baseConfig();
      config.parameters.push({ code, value: 'Patient/example' });
      const scopes = new VersionScopes(config);

      expect(scopes.versionsForArtifact({ resourceType: 'Patient', id: 'example' })).toEqual([
        version
      ]);
      expect(scopes.configurationIssues()).toEqual([]);
    }
  });

  it('ignores unrelated inclusion names but diagnoses unsupported version-shaped names', () => {
    const config = baseConfig();
    config.parameters.push(
      { code: 'document-inclusion', value: 'document' },
      { code: { code: 'custom-inclusion' }, value: 'custom' },
      { code: 'r6-inclusion', value: 'future' },
      { code: '4.2-inclusion', value: 'unsupported' }
    );
    const scopes = new VersionScopes(config);

    expect(scopes.configurationIssues()).toEqual([
      { severity: 'warn', message: expect.stringContaining('r6-inclusion') },
      { severity: 'warn', message: expect.stringContaining('4.2-inclusion') }
    ]);
    expect(scopes.artifactCounts()).toEqual({ r5: 0, r4: 0, r4b: 0 });
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

  it('limits the originally declared package to versions that select it', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.xver',
        version: '1.0.0',
        extension: [
          versionExtension('r4', { packageId: 'example.xver.r4', version: '4.0.1' }),
          versionExtension('r4b', { use: 'remove' })
        ]
      }
    ];

    const scopes = new VersionScopes(config);

    // example.xver is replaced in r4, removed in r4b, and has no extension for r5, so no target version uses it.
    expect(scopes.packageBandFor('r4', 'example.xver', '1.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r4b', 'example.xver', '1.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r5', 'example.xver', '1.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r4', 'example.xver.r4', '4.0.1')).toBe('in-scope');
  });

  it('keeps the originally declared package in scope for a version that selects it without replacing it', () => {
    const config = baseConfig();
    config.dependencies = [
      {
        packageId: 'example.plain',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(scopes.packageBandFor('r4', 'example.plain', '1.0.0')).toBe('in-scope');
    expect(scopes.packageBandFor('r4b', 'example.plain', '1.0.0')).toBe('out-of-version');
    expect(scopes.packageBandFor('r5', 'example.plain', '1.0.0')).toBe('out-of-version');
  });

  it('leaves a dependency with no version extension broadly available', () => {
    const config = baseConfig();
    config.dependencies = [
      { packageId: 'example.legacy', version: '1.0.0' },
      {
        packageId: 'example.scoped',
        version: '1.0.0',
        extension: [versionExtension('r4')]
      }
    ];

    const scopes = new VersionScopes(config);

    expect(
      scopes.targetVersions.map(v => scopes.packageBandFor(v, 'example.legacy', '1.0.0'))
    ).toEqual(['broad', 'broad', 'broad']);
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

  describe('effective dependency selection', () => {
    const declared = { packageId: 'example.base', version: '1.0.0' };
    const replacement = { packageId: 'example.replacement', version: '2.0.0' };
    const selected = (
      version: string,
      pkg: PackageSpec = declared
    ): EffectiveVersionDependency => ({ version, kind: 'selected', package: pkg });
    const cases: {
      name: string;
      dep: ImplementationGuideDependsOn;
      selections: EffectiveVersionDependency[];
      packages: PackageSpec[];
      rejected: number;
    }[] = [
      {
        name: 'the first retained occurrence, not rejected or later duplicate occurrences',
        dep: {
          ...declared,
          extension: [
            versionExtension('r4', { use: 'typo' }),
            versionExtension('r4', replacement),
            versionExtension('4.0.1', { packageId: 'example.ignored' }),
            versionExtension('r5')
          ]
        },
        selections: [
          selected('r5'),
          selected('r4', replacement),
          { version: 'r4b', kind: 'absent' }
        ],
        packages: [declared, replacement],
        rejected: 1
      },
      {
        name: 'removal before a later override, separately from an absent target',
        dep: {
          ...declared,
          extension: [
            versionExtension('r4', { use: 'remove' }),
            versionExtension('r4', replacement),
            versionExtension('r5')
          ]
        },
        selections: [
          selected('r5'),
          { version: 'r4', kind: 'removed' },
          { version: 'r4b', kind: 'absent' }
        ],
        packages: [declared],
        rejected: 0
      },
      {
        name: 'independently omitted package ids and requested versions',
        dep: {
          ...declared,
          extension: [
            versionExtension('r4', { packageId: replacement.packageId }),
            versionExtension('r4b', { version: replacement.version }),
            versionExtension('r5')
          ]
        },
        selections: [
          selected('r5'),
          selected('r4', { packageId: replacement.packageId, version: declared.version }),
          selected('r4b', { packageId: declared.packageId, version: replacement.version })
        ],
        packages: [
          declared,
          { packageId: replacement.packageId, version: declared.version },
          { packageId: declared.packageId, version: replacement.version }
        ],
        rejected: 0
      },
      {
        name: 'all rejected occurrences without making the declared package broad',
        dep: {
          ...declared,
          extension: [
            versionExtension('banana'),
            versionExtension('r6'),
            versionExtension('r4', { use: 'typo' })
          ]
        },
        selections: [
          { version: 'r5', kind: 'absent' },
          { version: 'r4', kind: 'absent' },
          { version: 'r4b', kind: 'absent' }
        ],
        packages: [],
        rejected: 3
      },
      {
        name: 'unscoped dependencies for all targets without extra loading requests',
        dep: declared,
        selections: [selected('r5'), selected('r4'), selected('r4b')],
        packages: [],
        rejected: 0
      },
      {
        name: 'selected packages with an inherited undefined version',
        dep: {
          packageId: declared.packageId,
          extension: [versionExtension('r4', { packageId: replacement.packageId })]
        },
        selections: [
          { version: 'r5', kind: 'absent' },
          selected('r4', { packageId: replacement.packageId, version: undefined }),
          { version: 'r4b', kind: 'absent' }
        ],
        packages: [{ packageId: replacement.packageId, version: undefined }],
        rejected: 0
      },
      {
        name: 'one loading request for a package selected by several targets',
        dep: {
          ...declared,
          extension: [
            versionExtension('r4', replacement),
            versionExtension('r5', replacement),
            versionExtension('r4b', replacement)
          ]
        },
        selections: [
          selected('r5', replacement),
          selected('r4', replacement),
          selected('r4b', replacement)
        ],
        packages: [replacement],
        rejected: 0
      }
    ];

    it.each(cases)(
      'preserves $name in both consumers',
      ({ dep, selections, packages, rejected }) => {
        const config = baseConfig();
        config.dependencies = [dep];
        const scopes = new VersionScopes(config);
        const effective = getEffectiveVersionDependencies(dep, scopes.targetVersions);

        expect(effective.declaredPackage).toEqual({
          packageId: dep.packageId,
          version: dep.version
        });
        expect(effective.hasVersionExtensions).toBe(dep.extension != null);
        expect(effective.rejected).toHaveLength(rejected);
        expect(effective.selections).toEqual(selections);
        expect(getVersionScopedPackages(dep, scopes.targetVersions)).toEqual(packages);
        for (const pkg of [effective.declaredPackage, ...packages]) {
          for (const version of scopes.targetVersions) {
            const applies = selections.some(
              selection =>
                selection.kind === 'selected' &&
                selection.version === version &&
                selection.package.packageId === pkg.packageId &&
                selection.package.version === pkg.version
            );
            expect(scopes.packageBandFor(version, pkg.packageId, pkg.version ?? '7.8.9')).toBe(
              !effective.hasVersionExtensions ? 'broad' : applies ? 'in-scope' : 'out-of-version'
            );
          }
        }
      }
    );

    it('returns one selection per target in first-seen target order', () => {
      expect(getEffectiveVersionDependencies(declared, ['r4', 'r4', 'r5']).selections).toEqual([
        selected('r4'),
        selected('r5')
      ]);
    });
  });

  it.each([undefined, 'latest', 'current', 'dev', '1.2.x', 'LATEST'])(
    'matches requested selector %s by package id without interpreting ranges',
    version => {
      expect(matchesPackageSpec({ packageId: 'example', version }, 'example', '1.2.9')).toBe(true);
      expect(matchesPackageSpec({ packageId: 'example', version }, 'other', '1.2.9')).toBe(false);
    }
  );

  it('isolates concrete versions and preserves matching when the loaded version is omitted', () => {
    const pkg = { packageId: 'example', version: '1.2.3' };
    expect(matchesPackageSpec(pkg, 'example', '1.2.3')).toBe(true);
    expect(matchesPackageSpec(pkg, 'example', '2.0.0')).toBe(false);
    expect(matchesPackageSpec(pkg, 'example')).toBe(true);
    expect(matchesPackageSpec({ ...pkg, version: '^1.2.0' }, 'example', '1.2.3')).toBe(false);
  });
});
