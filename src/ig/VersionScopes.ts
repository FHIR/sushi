import { Configuration } from '../fshtypes';
import { Extension, ImplementationGuideDependsOn } from '../fhirtypes';
import { getFHIRVersionInfo } from '../utils';

export const VERSION_SCOPE_EXTENSION =
  'http://hl7.org/fhir/tools/StructureDefinition/ig-dependency-for-version';

// Version tokens that never name a concrete package release: AUTOMATIC_DEPENDENCIES pin 'latest',
// and the dependency-update path in Processing skips 'current' and 'dev'.
const NON_CONCRETE_VERSIONS = ['latest', 'current', 'dev'];

export type VersionToken = string;

export type ArtifactScopeKey = {
  resourceType?: string;
  id?: string;
  url?: string;
};

export type DependencyPackage = {
  packageId: string;
  version?: string;
};

export type PackageBand = 'in-scope' | 'broad' | 'out-of-version';

export type InclusionEntry = {
  version: VersionToken;
  value: string;
};

export type InconsistentTypePrefixDiagnostic = {
  id: string;
  entries: InclusionEntry[];
};

export type VersionScopeDiagnostic = {
  version: VersionToken;
  value: string;
};

type VersionDependencyOccurrence = {
  version: VersionToken;
  packageId?: string;
  packageVersion?: string;
  remove: boolean;
};

/**
 * Version-scoped dependencies are represented as an exclusion/complement model rather than an
 * allow-list. FHIR core, automatic dependencies, the sushi-r5forR4 virtual package, and
 * sushi-local are not declared in user configuration dependencies, so an allow-list would
 * accidentally demote broadly available packages that must stay usable in every target version.
 */
export class VersionScopes {
  readonly targetVersions: VersionToken[];
  private readonly configured: boolean;
  private readonly packagesByVersion = new Map<VersionToken, DependencyPackage[]>();
  private readonly scopedPackageKeys = new Set<string>();
  private readonly inclusionEntries: InclusionEntry[] = [];
  private readonly inclusionVersionsByValue = new Map<string, Set<VersionToken>>();
  private readonly inclusionVersionsByTypelessValue = new Map<string, Set<VersionToken>>();

  constructor(
    private readonly config: Configuration,
    dependencies: ImplementationGuideDependsOn[] = config.dependencies ?? []
  ) {
    this.targetVersions = getTargetVersions(config);
    this.targetVersions.forEach(version => this.packagesByVersion.set(version, []));
    this.configured = dependencies.some(dep => getVersionDependencyOccurrences(dep).length > 0);
    this.indexDependencyScopes(dependencies);
    this.indexInclusions();
  }

  isConfigured(): boolean {
    return this.configured;
  }

  versionsForArtifact(key: ArtifactScopeKey): VersionToken[] {
    const versions = new Set<VersionToken>();
    for (const lookupKey of artifactLookupKeys(key)) {
      this.inclusionVersionsByValue.get(lookupKey)?.forEach(version => versions.add(version));
    }
    // An instance's scope key carries no resource type, so a Type/id inclusion entry can only be
    // matched on its id part. Keys that name their own type stay on exact matching so they never
    // match a different type's entry.
    if (key.resourceType == null && key.id != null) {
      this.inclusionVersionsByTypelessValue.get(key.id)?.forEach(version => versions.add(version));
    }
    return versions.size
      ? this.targetVersions.filter(version => versions.has(version))
      : this.targetVersions;
  }

  packageBandFor(
    version: VersionToken,
    packageName?: string,
    packageVersion?: string
  ): PackageBand {
    if (!this.configured || packageName == null) {
      return 'broad';
    }
    const scopedKeys = packageKeys(packageName, packageVersion);
    if (!scopedKeys.some(key => this.scopedPackageKeys.has(key))) {
      return 'broad';
    }
    const versionPackages = this.packagesByVersion.get(version) ?? [];
    return versionPackages.some(dep => matchesPackage(dep, packageName, packageVersion))
      ? 'in-scope'
      : 'out-of-version';
  }

  packageBandsForVersions(
    versions: VersionToken[],
    packageName?: string,
    packageVersion?: string
  ): PackageBand {
    const bands = versions.map(version =>
      this.packageBandFor(version, packageName, packageVersion)
    );
    if (bands.includes('in-scope')) {
      return 'in-scope';
    }
    if (bands.includes('broad')) {
      return 'broad';
    }
    return 'out-of-version';
  }

  artifactCounts(exportedKeys?: ArtifactScopeKey[]): Record<VersionToken, number> {
    const counts = Object.fromEntries(this.targetVersions.map(version => [version, 0]));
    if (exportedKeys) {
      exportedKeys.forEach(key => {
        this.versionsForArtifact(key).forEach(version => counts[version]++);
      });
    } else {
      this.inclusionEntries.forEach(entry => counts[entry.version]++);
    }
    return counts;
  }

  inconsistentTypePrefixes(): InconsistentTypePrefixDiagnostic[] {
    const byBareId = new Map<string, InclusionEntry[]>();
    this.inclusionEntries.forEach(entry => {
      const parts = entry.value.match(/^([^/]+)\/([^/]+)$/);
      if (parts) {
        const [, , id] = parts;
        if (!byBareId.has(id)) {
          byBareId.set(id, []);
        }
        byBareId.get(id).push(entry);
      }
    });
    return [...byBareId.entries()]
      .map(([id, entries]) => ({ id, entries }))
      .filter(({ entries }) => new Set(entries.map(entry => entry.value.split('/')[0])).size > 1);
  }

  diagnosticsForExportedArtifacts(exportedKeys: ArtifactScopeKey[]): VersionScopeDiagnostic[] {
    return this.inclusionEntries.filter(entry => {
      return !exportedKeys.some(key => artifactLookupKeys(key).includes(entry.value));
    });
  }

  private indexDependencyScopes(dependencies: ImplementationGuideDependsOn[]): void {
    dependencies.forEach(dep => {
      const occurrences = getVersionDependencyOccurrences(dep);
      if (occurrences.length === 0) {
        this.targetVersions.forEach(version =>
          this.addPackageForVersion(
            version,
            { packageId: dep.packageId, version: dep.version },
            false
          )
        );
        return;
      }
      this.targetVersions.forEach(version => {
        const occurrence = occurrences.find(o => o.version === version);
        if (occurrence && !occurrence.remove) {
          this.addPackageForVersion(
            version,
            {
              packageId: occurrence.packageId ?? dep.packageId,
              version: occurrence.packageVersion ?? dep.version
            },
            true
          );
        }
      });
    });
  }

  private addPackageForVersion(
    version: VersionToken,
    dep: DependencyPackage,
    isVersionScoped: boolean
  ): void {
    if (dep.packageId == null) {
      return;
    }
    const packages = this.packagesByVersion.get(version);
    if (
      !packages.some(
        existing =>
          packageKey(existing.packageId, existing.version) ===
          packageKey(dep.packageId, dep.version)
      )
    ) {
      packages.push(dep);
    }
    if (isVersionScoped) {
      this.scopedPackageKeys.add(packageKey(dep.packageId, dep.version));
      // A concrete version must not register the bare package id, or an untagged dependency that
      // merely shares that id would be dragged out of the broad band.
      if (!isConcreteVersion(dep.version)) {
        this.scopedPackageKeys.add(dep.packageId);
      }
    }
  }

  private indexInclusions(): void {
    this.config.parameters
      ?.filter(parameter => typeof parameter.code === 'string')
      .forEach(parameter => {
        const match = (parameter.code as string).match(/^(.+)-inclusion$/);
        const version = match ? normalizeVersionToken(match[1]) : null;
        if (version && this.targetVersions.includes(version)) {
          const entry = { version, value: parameter.value };
          this.inclusionEntries.push(entry);
          if (!this.inclusionVersionsByValue.has(entry.value)) {
            this.inclusionVersionsByValue.set(entry.value, new Set());
          }
          this.inclusionVersionsByValue.get(entry.value).add(version);
          const typeless = entry.value.match(/^([^/]+)\/([^/]+)$/);
          if (typeless) {
            const [, , id] = typeless;
            if (!this.inclusionVersionsByTypelessValue.has(id)) {
              this.inclusionVersionsByTypelessValue.set(id, new Set());
            }
            this.inclusionVersionsByTypelessValue.get(id).add(version);
          }
        }
      });
  }
}

export function getTargetVersions(config: Configuration): VersionToken[] {
  const versions: VersionToken[] = [];
  const addVersion = (version: string) => {
    const normalized = normalizeVersionToken(version);
    if (normalized && !versions.includes(normalized)) {
      versions.push(normalized);
    }
  };
  config.fhirVersion?.forEach(addVersion);
  config.parameters
    ?.filter(parameter => parameter.code === 'generate-version')
    .forEach(parameter => addVersion(parameter.value));
  return versions;
}

export function artifactLookupKeys(key: ArtifactScopeKey): string[] {
  return [
    key.resourceType && key.id ? `${key.resourceType}/${key.id}` : null,
    key.id,
    key.url
  ].filter((value): value is string => value != null);
}

export function normalizeVersionToken(version: string): VersionToken | undefined {
  const token = version?.toLowerCase();
  if (/^r\d+b?$/.test(token)) {
    return token;
  }
  const versionInfo = getFHIRVersionInfo(version);
  if (versionInfo.name !== '??') {
    return versionInfo.name.toLowerCase();
  }
}

function getVersionDependencyOccurrences(
  dep: ImplementationGuideDependsOn
): VersionDependencyOccurrence[] {
  return (dep.extension ?? [])
    .filter(extension => extension.url === VERSION_SCOPE_EXTENSION)
    .map(toVersionDependencyOccurrence)
    .filter((occurrence): occurrence is VersionDependencyOccurrence => occurrence?.version != null);
}

function toVersionDependencyOccurrence(extension: Extension): VersionDependencyOccurrence {
  const subExtensions: Extension[] = extension.extension ?? [];
  const fhirVersion = valueOf(subExtensions.find(sub => sub.url === 'fhirVersion'));
  const version = fhirVersion ? normalizeVersionToken(fhirVersion) : null;
  if (version == null) {
    return;
  }
  return {
    version,
    packageId: valueOf(subExtensions.find(sub => sub.url === 'packageId')),
    packageVersion: valueOf(subExtensions.find(sub => sub.url === 'version')),
    remove: valueOf(subExtensions.find(sub => sub.url === 'use')) === 'remove'
  };
}

function valueOf(extension: Extension): string | undefined {
  return (
    extension?.valueCode ?? extension?.valueString ?? extension?.valueId ?? extension?.valueUri
  );
}

function packageKey(packageId: string, version?: string): string {
  return version ? `${packageId}|${version}` : packageId;
}

function packageKeys(packageId: string, version?: string): string[] {
  return [packageKey(packageId, version), packageId];
}

function isConcreteVersion(version?: string): boolean {
  return version != null && !NON_CONCRETE_VERSIONS.includes(version.toLowerCase());
}

function matchesPackage(
  dep: DependencyPackage,
  packageName: string,
  packageVersion?: string
): boolean {
  if (dep.packageId !== packageName) {
    return false;
  }
  // The package loader resolves a dependency pinned to a non-concrete token to a real version that
  // can never equal the configured token, so those fall back to matching on package id alone.
  if (!isConcreteVersion(dep.version) || !isConcreteVersion(packageVersion)) {
    return true;
  }
  return dep.version === packageVersion;
}
