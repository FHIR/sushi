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

// Numeric input aliases, not normalized VersionFamilyToken names such as r4, r4b, and r5.
// Keep this list explicit: appending .0 to any major.minor would accept unsupported aliases
// such as 4.2. The Publisher lists 4.0 and 4.3; SUSHI also accepts 5.0 for compatibility.
const VERSION_FAMILY_TOKENS = ['4.0', '4.3', '5.0'];

export type VersionFamilyToken = string;

export type ArtifactScopeKey = {
  resourceType?: string;
  id?: string;
  url?: string;
};

export type PackageSpec = {
  packageId: string;
  version?: string;
};

export type PackageBand = 'in-scope' | 'broad' | 'out-of-version';

export type InclusionEntry = {
  version: VersionFamilyToken;
  value: string;
};

export type InstanceScopeInterpretation =
  | { kind: 'typed'; resourceType: string; entries: InclusionEntry[] }
  | { kind: 'unlisted'; entries: InclusionEntry[] };

export type InstanceScopeAlternative = {
  versions: VersionFamilyToken[];
  interpretations: InstanceScopeInterpretation[];
};

export type InconsistentTypePrefixDiagnostic = {
  id: string;
  entries: InclusionEntry[];
};

export type VersionScopeDiagnostic = {
  version: VersionFamilyToken;
  value: string;
};

export type VersionScopeConfigIssue = {
  severity: 'warn' | 'error';
  message: string;
};

type VersionDependencyOccurrence = {
  version: VersionFamilyToken;
  packageId?: string;
  packageVersion?: string;
  remove: boolean;
};

type ParsedVersionDependencies = {
  occurrences: VersionDependencyOccurrence[];
  rejected: string[];
  hasVersionExtensions: boolean;
};

export type EffectiveVersionDependency =
  | { version: VersionFamilyToken; kind: 'selected'; package: PackageSpec }
  | { version: VersionFamilyToken; kind: 'removed' | 'absent' };

export type EffectiveVersionDependencies = {
  declaredPackage: PackageSpec;
  hasVersionExtensions: boolean;
  rejected: string[];
  selections: EffectiveVersionDependency[];
};

/**
 * Version scoping for IGs that produce artifacts for more than one FHIR version.
 *
 * Scoping is enabled only when a dependency uses the ig-dependency-for-version extension. Every
 * other IG resolves definitions exactly as before.
 *
 * - Target versions come from fhirVersion and any generate-version parameters.
 * - A dependency's ig-dependency-for-version extensions name the package (id and version) to use
 *   for a target version, or say the dependency does not apply to that version.
 * - Parameters such as r4-inclusion list the artifacts that belong to a version. An artifact that
 *   is not listed belongs to every target version.
 *
 * When SUSHI looks up a definition while exporting an artifact, it preserves the usual FHIR type
 * order. For definitions of the same type, packages selected for that artifact's versions and
 * packages available to every version come before packages selected only for other versions.
 * Among the first two groups, high-priority automatic dependencies come before ordinary
 * dependencies, and low-priority automatic dependencies come after them. Within each priority,
 * version-specific packages come before packages available to every version, then normal package
 * order breaks ties. Packages selected only for other versions stay in normal package order.
 * With no artifact being exported, lookups use the normal package order.
 *
 * Only dependencies that use the extension are limited to particular versions. FHIR core,
 * automatic dependencies, the sushi-r5forR4 virtual package, sushi-local, and dependencies without
 * the extension remain available to every version. They are never listed per version in the
 * configuration, so scoping has to limit the packages it knows about rather than allow only
 * listed ones.
 *
 * The IG Publisher's multi-version rules are at
 * https://github.com/HL7/fhir-ig-publisher/blob/master/multi-version-IGs.md. SUSHI reads the same
 * configuration, but how it ranks packages when resolving a definition is specific to SUSHI.
 */
export class VersionScopes {
  readonly targetVersions: VersionFamilyToken[];
  private readonly configured: boolean;
  private readonly packagesByVersion = new Map<VersionFamilyToken, PackageSpec[]>();
  private readonly scopedPackageKeys = new Set<string>();
  private readonly inclusionEntries: InclusionEntry[] = [];
  private readonly inclusionVersionsByValue = new Map<string, Set<VersionFamilyToken>>();
  private readonly instanceInclusionsById = new Map<string, Map<string, InclusionEntry[]>>();
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

  versionsForArtifact(key: ArtifactScopeKey): VersionFamilyToken[] {
    const versions = new Set<VersionFamilyToken>();
    for (const lookupKey of artifactLookupKeys(key)) {
      this.inclusionVersionsByValue.get(lookupKey)?.forEach(version => versions.add(version));
    }
    // An instance's scope key carries no resource type, so a Type/id inclusion entry can only be
    // matched on its id part. Keys that name their own type stay on exact matching so they never
    // match a different type's entry.
    if (key.resourceType == null && key.id != null) {
      this.instanceInclusionsById
        .get(key.id)
        ?.forEach(entries => entries.forEach(entry => versions.add(entry.version)));
    }
    return versions.size
      ? this.targetVersions.filter(version => versions.has(version))
      : this.targetVersions;
  }

  instanceScopeAlternatives(key: ArtifactScopeKey): InstanceScopeAlternative[] {
    const direct = this.directInstanceInclusions(key);
    const typed = this.instanceInclusionsById.get(key.id);
    const alternatives = new Map<string, InstanceScopeAlternative>();
    const add = (interpretation: InstanceScopeInterpretation) => {
      const versions = this.versionsForInclusions(interpretation.entries);
      const membership = JSON.stringify(versions);
      if (!alternatives.has(membership)) {
        alternatives.set(membership, { versions, interpretations: [] });
      }
      alternatives.get(membership).interpretations.push(interpretation);
    };
    for (const resourceType of [...(typed?.keys() ?? [])].sort()) {
      add({
        kind: 'typed',
        resourceType,
        entries: this.distinctInclusions([...direct, ...typed.get(resourceType)])
      });
    }
    add({ kind: 'unlisted', entries: direct });
    return [...alternatives.values()];
  }

  versionsForInstanceIdentity(key: ArtifactScopeKey, sdType: string): VersionFamilyToken[] {
    // Match StructureDefinition.pathType for URL-valued logical types.
    const resourceType = sdType.startsWith('http')
      ? sdType.slice(sdType.lastIndexOf('/') + 1)
      : sdType;
    return this.versionsForInclusions([
      ...this.directInstanceInclusions(key),
      ...(this.instanceInclusionsById.get(key.id)?.get(resourceType) ?? [])
    ]);
  }

  private directInstanceInclusions(key: ArtifactScopeKey): InclusionEntry[] {
    return this.distinctInclusions(
      this.inclusionEntries.filter(entry => entry.value === key.id || entry.value === key.url)
    );
  }

  private distinctInclusions(entries: InclusionEntry[]): InclusionEntry[] {
    return entries.filter(
      (entry, index) =>
        entries.findIndex(
          candidate => candidate.version === entry.version && candidate.value === entry.value
        ) === index
    );
  }

  private versionsForInclusions(entries: InclusionEntry[]): VersionFamilyToken[] {
    const versions = new Set(entries.map(entry => entry.version));
    return this.targetVersions.filter(version => versions.size === 0 || versions.has(version));
  }

  packageBandFor(
    version: VersionFamilyToken,
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
    return versionPackages.some(dep => matchesPackageSpec(dep, packageName, packageVersion))
      ? 'in-scope'
      : 'out-of-version';
  }

  packageBandsForVersions(
    versions: VersionFamilyToken[],
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

  artifactCounts(): Record<VersionFamilyToken, number> {
    const counts = Object.fromEntries(this.targetVersions.map(version => [version, 0]));
    this.inclusionEntries.forEach(entry => counts[entry.version]++);
    return counts;
  }

  /**
   * Finds ids that inclusion parameters list with more than one resource type. For example, with
   * r4-inclusion = SearchParameter/shared and r4b-inclusion = ValueSet/shared, the id "shared" has
   * two type prefixes. That may be two legitimate resources or a typo, so callers report it only
   * as advice. Bare ids and canonical URLs are not checked.
   */
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
      const { declaredPackage, selections, rejected, hasVersionExtensions } =
        getEffectiveVersionDependencies(dep, this.targetVersions);
      // Once a dependency has any version-specific extension, the package it originally names
      // (packageId and version) is used only in target versions that select it. Otherwise, if
      // every extension replaced it with a different package, the original would count as
      // available to every version and could still supply definitions in a version where it was
      // replaced or removed.
      if (hasVersionExtensions) {
        this.markPackageScoped(declaredPackage);
      }
      if (hasVersionExtensions && selections.every(selection => selection.kind === 'absent')) {
        this.configIssues.push({
          severity: 'error',
          message:
            `Every version-scope extension on dependency ${dep.packageId} was discarded (${rejected.join('; ')}). ` +
            'The dependency is treated as out of scope for every target version. Fix the extensions so version membership is applied as intended.'
        });
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
      selections.forEach(selection => {
        if (selection.kind === 'selected') {
          this.addPackageForVersion(selection.version, selection.package, hasVersionExtensions);
        }
      });
    });
  }

  private addPackageForVersion(
    version: VersionFamilyToken,
    dep: PackageSpec,
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

  private markPackageScoped(dep: PackageSpec): void {
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
      // Publisher version tokens include numeric prefixes, not just release names:
      // https://github.com/HL7/fhir-ig-publisher/blob/master/multi-version-IGs.md#version-tokens
      // SUSHI also preserves 5.0 and supported numeric prereleases as compatibility inputs.
      const match = code?.match(/^(r\d+b?|\d+\.\d+(?:\.\d+)?(?:-\S+)?)-inclusion$/i);
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
      const addIdentity = (resourceType: string, id: string) => {
        if (!this.instanceInclusionsById.has(id)) {
          this.instanceInclusionsById.set(id, new Map());
        }
        const byType = this.instanceInclusionsById.get(id);
        if (!byType.has(resourceType)) {
          byType.set(resourceType, []);
        }
        byType.get(resourceType).push(entry);
      };
      const typed = entry.value.match(/^([^/]+)\/([^/]+)$/);
      if (typed) {
        addIdentity(typed[1], typed[2]);
      }
      // InstanceExporter assigns ${canonical}/${pathType}/${id} to a Usage: #definition instance,
      // so an artifact's final URL can be a project-canonical URL that a typeless { id } key could
      // never match on its own. Only this project's canonical is indexed this way.
      const canonicalPrefix = this.config.canonical ? `${this.config.canonical}/` : null;
      if (canonicalPrefix != null && entry.value.startsWith(canonicalPrefix)) {
        const segments = entry.value.slice(canonicalPrefix.length).split('/');
        if (segments.length === 2 && segments.every(segment => segment.length > 0)) {
          addIdentity(segments[0], segments[1]);
        }
      }
    });
  }
}

export function getTargetVersions(
  config: Configuration,
  issues: VersionScopeConfigIssue[] = []
): VersionFamilyToken[] {
  const versions: VersionFamilyToken[] = [];
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

export function normalizeVersionToken(version: string): VersionFamilyToken | undefined {
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

/**
 * Returns the packages (package id and requested version) that a dependency's version-specific
 * extensions select for the given target versions, in target-version order and without
 * duplicates. Loading uses this list; version scoping uses the same selections, because both come
 * from getEffectiveVersionDependencies. If loading followed different rules, it could load a
 * package that version scoping does not recognize as version-specific, and that package would
 * then be available to every version instead of only its intended ones.
 */
export function getVersionScopedPackages(
  dep: ImplementationGuideDependsOn,
  targetVersions: VersionFamilyToken[]
): PackageSpec[] {
  const { hasVersionExtensions, selections } = getEffectiveVersionDependencies(dep, targetVersions);
  if (!hasVersionExtensions) {
    return [];
  }
  const seen = new Set<string>();
  const packages: PackageSpec[] = [];
  selections.forEach(selection => {
    if (selection.kind !== 'selected') {
      return;
    }
    const selected = selection.package;
    const key = packageKey(selected.packageId, selected.version);
    if (selected.packageId != null && !seen.has(key)) {
      seen.add(key);
      packages.push(selected);
    }
  });
  return packages;
}

/**
 * Interprets each target using the first retained extension for that target. Package selections
 * preserve requested versions, including an omitted version; consumers decide what can be loaded.
 */
export function getEffectiveVersionDependencies(
  dep: ImplementationGuideDependsOn,
  targetVersions: VersionFamilyToken[]
): EffectiveVersionDependencies {
  const { occurrences, rejected, hasVersionExtensions } = parseVersionDependencies(
    dep,
    targetVersions
  );
  const declaredPackage = { packageId: dep.packageId, version: dep.version };
  const selections = [...new Set(targetVersions)].map((version): EffectiveVersionDependency => {
    if (!hasVersionExtensions) {
      return { version, kind: 'selected', package: declaredPackage };
    }
    const occurrence = occurrences.find(item => item.version === version);
    if (occurrence == null) {
      return { version, kind: 'absent' };
    }
    if (occurrence.remove) {
      return { version, kind: 'removed' };
    }
    return {
      version,
      kind: 'selected',
      package: {
        packageId: occurrence.packageId ?? dep.packageId,
        version: occurrence.packageVersion ?? dep.version
      }
    };
  });
  return { declaredPackage, hasVersionExtensions, rejected, selections };
}

function parseVersionDependencies(
  dep: ImplementationGuideDependsOn,
  targetVersions: VersionFamilyToken[]
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
    // An omitted `use` means override. Reject any other value rather than guessing.
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

export function matchesPackageSpec(
  dep: PackageSpec,
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
