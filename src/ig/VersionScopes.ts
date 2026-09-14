import { Configuration } from '../fshtypes';
import {
  Extension,
  ImplementationGuideDefinitionParameter,
  ImplementationGuideDependsOn
} from '../fhirtypes';
import { getFHIRVersionInfo } from '../utils';

export const VERSION_SCOPE_EXTENSION =
  'http://hl7.org/fhir/tools/StructureDefinition/ig-dependency-for-version';

// Version tokens that never name a concrete package release: AUTOMATIC_DEPENDENCIES pin 'latest',
// and the dependency-update path in Processing skips 'current' and 'dev'.
const NON_CONCRETE_VERSIONS = ['latest', 'current', 'dev'];

// Two-part family tokens from the Publisher's multi-version-IGs.md "Version tokens" table, which
// accepts a family token wherever a FHIR version is named: generate-version, the per-version
// dependency extension, and the inclusion parameters. The table is the allow-list, so this set is
// closed on purpose. A generic <major>.<minor> rule would resolve '4.2' to R5 through
// FHIRVersionUtils and silently turn '3.0', '4.1', and '6.0' into targets.
const VERSION_FAMILY_TOKENS = ['4.0', '4.3', '5.0'];

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

export type VersionScopeConfigIssue = {
  severity: 'warn' | 'error';
  message: string;
};

type VersionDependencyOccurrence = {
  version: VersionToken;
  packageId?: string;
  packageVersion?: string;
  remove: boolean;
};

type ParsedVersionDependencies = {
  occurrences: VersionDependencyOccurrence[];
  rejected: string[];
  hasVersionExtensions: boolean;
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
  private readonly configIssues: VersionScopeConfigIssue[] = [];

  constructor(
    private readonly config: Configuration,
    dependencies: ImplementationGuideDependsOn[] = config.dependencies ?? []
  ) {
    this.targetVersions = getTargetVersions(config, this.configIssues);
    this.targetVersions.forEach(version => this.packagesByVersion.set(version, []));
    this.configured = dependencies.some(
      dep => parseVersionDependencies(dep, this.targetVersions).hasVersionExtensions
    );
    this.indexDependencyScopes(dependencies);
    this.indexInclusions();
  }

  isConfigured(): boolean {
    return this.configured;
  }

  configurationIssues(): VersionScopeConfigIssue[] {
    return this.configIssues;
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
      const { occurrences, rejected, hasVersionExtensions } = parseVersionDependencies(
        dep,
        this.targetVersions
      );
      if (!hasVersionExtensions) {
        this.targetVersions.forEach(version =>
          this.addPackageForVersion(
            version,
            { packageId: dep.packageId, version: dep.version },
            false
          )
        );
        return;
      }
      if (occurrences.length === 0) {
        // Marking the package scoped without adding it to any version lands it in
        // 'out-of-version' everywhere rather than silently widening it to 'broad'.
        this.configIssues.push({
          severity: 'error',
          message:
            `Every version-scope extension on dependency ${dep.packageId} was discarded (${rejected.join('; ')}). ` +
            'The dependency is treated as out of scope for every target version. Fix the extensions so version membership is applied as intended.'
        });
        this.markPackageScoped({ packageId: dep.packageId, version: dep.version });
        return;
      }
      rejected.forEach(reason =>
        this.configIssues.push({
          severity: 'warn',
          message:
            `A version-scope extension on dependency ${dep.packageId} was discarded (${reason}). ` +
            'Fix the extension so version membership is applied as intended.'
        })
      );
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
      this.markPackageScoped(dep);
    }
  }

  private markPackageScoped(dep: DependencyPackage): void {
    if (dep.packageId == null) {
      return;
    }
    this.scopedPackageKeys.add(packageKey(dep.packageId, dep.version));
    // A concrete version must not register the bare package id, or an untagged dependency that
    // merely shares that id would be dragged out of the broad band.
    if (!isConcreteVersion(dep.version)) {
      this.scopedPackageKeys.add(dep.packageId);
    }
  }

  private indexInclusions(): void {
    this.config.parameters?.forEach(parameter => {
      const code = parameterCode(parameter);
      const match = code?.match(/^(.+)-inclusion$/);
      if (!match) {
        return;
      }
      const version = normalizeVersionToken(match[1]);
      if (version == null || !this.targetVersions.includes(version)) {
        this.configIssues.push({
          severity: 'warn',
          message:
            `The ${code} parameter does not name one of this IG's target versions (${this.targetVersions.join(', ')}) and was ignored. ` +
            'Use an inclusion parameter whose prefix names a target version.'
        });
        return;
      }
      // Checked before any match() on the value: a malformed IG resource can supply a non-string
      // value, which used to raise an unhandled TypeError here.
      if (typeof parameter.value !== 'string') {
        this.configIssues.push({
          severity: 'warn',
          message:
            `The ${code} parameter has a value that is not a string ('${parameter.value}') and was ignored. ` +
            'Use a Type/id or canonical URL.'
        });
        return;
      }
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
    });
  }
}

export function getTargetVersions(
  config: Configuration,
  issues: VersionScopeConfigIssue[] = []
): VersionToken[] {
  const versions: VersionToken[] = [];
  const addVersion = (version: string) => {
    const normalized = normalizeVersionToken(version);
    if (normalized && !versions.includes(normalized)) {
      versions.push(normalized);
    }
  };
  config.fhirVersion?.forEach(addVersion);
  config.parameters
    ?.filter(parameter => parameterCode(parameter) === 'generate-version')
    .forEach(parameter => {
      // normalizeVersionToken opens with version?.toLowerCase(), so a non-string value from an IG
      // resource would throw during dependency loading rather than be reported.
      if (typeof parameter.value !== 'string' || normalizeVersionToken(parameter.value) == null) {
        issues.push({
          severity: 'warn',
          message:
            `The generate-version parameter value '${parameter.value}' is not a usable FHIR version token and was ignored. ` +
            'Use a token such as r4, r4b, or r5.'
        });
        return;
      }
      addVersion(parameter.value);
    });
  return versions;
}

// ImplementationGuideDefinitionParameter.code is `string | Coding` because R5 changed it from a
// code to a Coding. The YAML path always yields a string (importConfiguration coerces it), but
// loadConfigurationFromIgResource copies definition.parameter verbatim, so an R5 IG resource
// supplied as input reaches this model with Coding codes.
function parameterCode(parameter: ImplementationGuideDefinitionParameter): string | undefined {
  return typeof parameter.code === 'string' ? parameter.code : parameter.code?.code;
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
  // Suffixing '.0' and re-querying keeps FHIRVersionUtils the single source of truth for version
  // families instead of duplicating its table here.
  if (VERSION_FAMILY_TOKENS.includes(token)) {
    const familyInfo = getFHIRVersionInfo(`${token}.0`);
    if (familyInfo.name !== '??') {
      return familyInfo.name.toLowerCase();
    }
  }
}

function parseVersionDependencies(
  dep: ImplementationGuideDependsOn,
  targetVersions: VersionToken[]
): ParsedVersionDependencies {
  const extensions = (dep.extension ?? []).filter(
    extension => extension.url === VERSION_SCOPE_EXTENSION
  );
  const occurrences: VersionDependencyOccurrence[] = [];
  const rejected: string[] = [];
  extensions.forEach(extension => {
    const subExtensions: Extension[] = extension.extension ?? [];
    const fhirVersionExtension = subExtensions.find(sub => sub.url === 'fhirVersion');
    const fhirVersion = valueOf(fhirVersionExtension);
    if (typeof fhirVersion !== 'string') {
      rejected.push(
        `fhirVersion ${fhirVersionExtension == null ? '(missing)' : `'${fhirVersion}'`} is not a usable FHIR version token`
      );
      return;
    }
    const version = normalizeVersionToken(fhirVersion);
    if (version == null) {
      rejected.push(`fhirVersion '${fhirVersion}' is not a usable FHIR version token`);
      return;
    }
    // A typo in `use` used to compute `remove: false` and apply silently as an override.
    const use = valueOf(subExtensions.find(sub => sub.url === 'use'));
    if (use != null && use !== 'override' && use !== 'remove') {
      rejected.push(`use '${use}' for ${version} is not 'override' or 'remove'`);
      return;
    }
    if (!targetVersions.includes(version)) {
      rejected.push(
        `fhirVersion '${fhirVersion}' resolves to ${version}, which is not one of the target versions (${targetVersions.join(', ')})`
      );
      return;
    }
    occurrences.push({
      version,
      packageId: valueOf(subExtensions.find(sub => sub.url === 'packageId')),
      packageVersion: valueOf(subExtensions.find(sub => sub.url === 'version')),
      remove: use === 'remove'
    });
  });
  return { occurrences, rejected, hasVersionExtensions: extensions.length > 0 };
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
  if (version == null) {
    return false;
  }
  const token = version.toLowerCase();
  // A patch-wildcard selector such as 1.2.x is resolved by the package loader to a real release,
  // so the resolved package version can never equal the configured token.
  return !NON_CONCRETE_VERSIONS.includes(token) && !token.endsWith('.x');
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
