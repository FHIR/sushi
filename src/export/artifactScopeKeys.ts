import { ArtifactScopeKey } from '../ig';

/**
 * Builds the version-scope key for an artifact from its eventual FHIR identity. Keys are derived
 * from FSH metadata alone, never by fishing, because entering the scope is what makes fishing
 * resolve correctly in the first place.
 */
export function artifactScopeKey(
  resourceType: string,
  id: string,
  canonical?: string
): ArtifactScopeKey {
  const key: ArtifactScopeKey = { resourceType, id };
  if (canonical != null && id != null) {
    key.url = `${canonical}/${resourceType}/${id}`;
  }
  return key;
}

/**
 * Instances are keyed by bare id only, because the resource type is not known until InstanceOf:
 * is resolved, and that resolution happens inside the scope.
 */
export function instanceScopeKey(id: string): ArtifactScopeKey {
  return { id };
}
