import { isEqual, uniqWith } from 'lodash';
import { Instance } from '../fshtypes';
import {
  ArtifactScopeKey,
  InstanceScopeAlternative,
  VersionFamilyToken,
  VersionScopes
} from '../ig/VersionScopes';
import { FishingDiagnostic, Metadata, Type } from '../utils/Fishable';
import { MasterFisher } from '../utils/MasterFisher';
import { AmbiguousInstanceVersionScopeError } from '../errors/AmbiguousInstanceVersionScopeError';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import { instanceScopeKey } from './artifactScopeKeys';

export const INSTANCE_OF_TYPES = [
  Type.Resource,
  Type.Profile,
  Type.Extension,
  Type.Type,
  Type.Logical
] as const;

type InstanceScopeProbe = {
  alternative: InstanceScopeAlternative;
  metadata?: Metadata;
  membership?: VersionFamilyToken[];
  diagnostics: FishingDiagnostic[];
};

export type ResolvedInstanceScope = {
  key: ArtifactScopeKey;
  versions: VersionFamilyToken[];
  metadata: Metadata;
  alternative: InstanceScopeAlternative;
  diagnostics: FishingDiagnostic[];
};

/**
 * Probes only the memberships implied by inclusion entries, including an unlisted identity.
 * Metadata fishing can perform normal insert-rule preparation, but no instance is materialized.
 */
export function resolveInstanceScope(
  instance: Instance,
  fisher: MasterFisher,
  scopes: VersionScopes
): ResolvedInstanceScope {
  const probes: InstanceScopeProbe[] = [];
  try {
    const key = instanceScopeKey(instance);
    for (const alternative of scopes.instanceScopeAlternatives(key)) {
      const probe: InstanceScopeProbe = { alternative, diagnostics: [] };
      probes.push(probe);
      probe.metadata = fisher.withFishingDiagnostics(probe.diagnostics, () =>
        fisher.inVersionScope(alternative.versions, () =>
          fisher.fishForMetadata(instance.instanceOf, ...INSTANCE_OF_TYPES)
        )
      );
      if (typeof probe.metadata?.sdType === 'string' && probe.metadata.sdType.length > 0) {
        probe.membership = scopes.versionsForInstanceIdentity(key, probe.metadata.sdType);
      }
    }

    if (probes.every(probe => probe.metadata == null)) {
      throw new InstanceOfNotDefinedError(instance.name, instance.instanceOf, instance.sourceInfo);
    }
    const consistent = probes.filter(probe =>
      isEqual(probe.membership, probe.alternative.versions)
    );
    const unresolved = probes.some(probe => probe.membership == null);
    if (unresolved || consistent.length !== 1) {
      const reason = unresolved
        ? 'Some membership alternatives have missing or incomplete InstanceOf metadata; they cannot safely be discarded.'
        : consistent.length === 0
          ? 'No consistent membership exists: resolving InstanceOf changes the required membership (a circular choice).'
          : 'Multiple version memberships are consistent with different InstanceOf definitions.';
      throw scopeError(
        instance,
        reason,
        probes.map(probe => describeProbe(probe, key))
      );
    }

    const selected = consistent[0];
    return {
      key,
      versions: selected.alternative.versions,
      metadata: selected.metadata,
      alternative: selected.alternative,
      diagnostics: selected.diagnostics
    };
  } catch (error) {
    reportInstanceScopeDiagnostics(
      fisher,
      probes.flatMap(probe => probe.diagnostics)
    );
    if (error instanceof Error && (!('sourceInfo' in error) || error.sourceInfo == null)) {
      Object.assign(error, { sourceInfo: instance.sourceInfo });
    }
    throw error;
  }
}

export function assertInstanceScopeDefinition(
  instance: Instance,
  scope: ResolvedInstanceScope,
  definition: { type?: string; url?: string; version?: string },
  scopes: VersionScopes
): void {
  const membership =
    typeof definition.type === 'string' && definition.type.length > 0
      ? scopes.versionsForInstanceIdentity(scope.key, definition.type)
      : undefined;
  if (
    definition.type !== scope.metadata.sdType ||
    (scope.metadata.url != null && definition.url !== scope.metadata.url) ||
    (scope.metadata.version != null && definition.version !== scope.metadata.version) ||
    !isEqual(membership, scope.versions)
  ) {
    throw scopeError(
      instance,
      'The consumed InstanceOf definition disagrees with the scoped metadata.',
      [
        describeAlternative(scope.alternative, scope.key),
        `Expected type ${scope.metadata.sdType}, definition ${definitionLabel(scope.metadata.url, scope.metadata.version)}, membership [${scope.versions.join(', ')}].`,
        `Actual type ${definition.type ?? '(unresolved)'}, definition ${definitionLabel(definition.url, definition.version)}, membership ${membership ? `[${membership.join(', ')}]` : '(unresolved)'}.`
      ]
    );
  }
}

export function reportInstanceScopeDiagnostics(
  fisher: MasterFisher,
  diagnostics: FishingDiagnostic[]
): void {
  uniqWith(
    diagnostics,
    (a, b) =>
      a.severity === b.severity && a.message === b.message && isEqual(a.sourceInfo, b.sourceInfo)
  ).forEach(diagnostic => fisher.reportFishingDiagnostic(diagnostic));
}

function scopeError(instance: Instance, reason: string, interpretations: string[]) {
  return new AmbiguousInstanceVersionScopeError(
    instance.name,
    instance.id,
    instance.instanceOf,
    reason,
    interpretations,
    instance.sourceInfo
  );
}

function definitionLabel(url?: string, version?: string): string {
  return `${url ?? '(no canonical URL)'}${version != null ? `|${version}` : ''}`;
}

function describeAlternative(alternative: InstanceScopeAlternative, key: ArtifactScopeKey): string {
  const interpretations = alternative.interpretations.map(interpretation => {
    const identity =
      interpretation.kind === 'typed'
        ? `${interpretation.resourceType}/${key.id}`
        : interpretation.entries.length === 0
          ? 'unlisted: all target versions'
          : 'unlisted type: direct inclusion matches';
    const entries = interpretation.entries.map(
      entry => `${entry.version}-inclusion: ${entry.value}`
    );
    return `${identity}${entries.length ? ` (${entries.join('; ')})` : ''}`;
  });
  return `[${alternative.versions.join(', ')}]: ${interpretations.join(' or ')}`;
}

function describeProbe(probe: InstanceScopeProbe, key: ArtifactScopeKey): string {
  const result = probe.metadata
    ? `type ${probe.metadata.sdType ?? '(unresolved)'}, definition ${definitionLabel(probe.metadata.url, probe.metadata.version)}`
    : 'InstanceOf not found';
  const membership = probe.membership ? `[${probe.membership.join(', ')}]` : '(unresolved)';
  return `${describeAlternative(probe.alternative, key)}; resolves to ${result}, membership ${membership}.`;
}
