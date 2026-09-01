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
 * is resolved, and that resolution happens inside the scope. VersionScopes matches a Type/id
 * inclusion entry against such a key by comparing the id part, so both
 * `r4-inclusion: SearchParameter/my-sp` and `r4-inclusion: my-sp` scope the instance. The only
 * ambiguity this admits -- one bare id listed under two different type prefixes -- is already
 * reported at startup by VersionScopes.inconsistentTypePrefixes().
 */
export function instanceScopeKey(id: string): ArtifactScopeKey {
  return { id };
}
