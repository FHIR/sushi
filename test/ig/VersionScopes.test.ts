import { Configuration } from '../../src/fshtypes';
import { VERSION_SCOPE_EXTENSION, VersionScopes } from '../../src/ig';

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
});
