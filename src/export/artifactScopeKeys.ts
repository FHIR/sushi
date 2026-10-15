import { ArtifactScopeKey } from '../ig';
import {
  Extension,
  FshCodeSystem,
  FshValueSet,
  Instance,
  Logical,
  Profile,
  Resource
} from '../fshtypes';
import { getNonInstanceValueFromRules } from '../fshtypes/common';
import { getUrlFromFshDefinition } from '../fhirtypes/common';

/**
 * Builds the version-scope key for an artifact. The URL comes from getUrlFromFshDefinition, so a
 * ^url caret rule wins over the canonical default. Keys are derived from FSH metadata alone, never
 * by fishing, because entering the scope is what makes fishing resolve correctly in the first
 * place.
 */
export function artifactScopeKey(
  resourceType: string,
  fshDefinition: Profile | Extension | Logical | Resource | FshValueSet | FshCodeSystem,
  canonical?: string
): ArtifactScopeKey {
  const key: ArtifactScopeKey = { resourceType, id: fshDefinition.id };
  if (canonical != null && fshDefinition.id != null) {
    key.url = getUrlFromFshDefinition(fshDefinition, canonical);
  }
  return key;
}

/**
 * Instances are keyed by bare id, because the resource type is not known until InstanceOf: is
 * resolved, and that resolution happens inside the scope. An assigned `url` is carried when the
 * FSH definition sets one; no URL is invented otherwise, since getUrlFromFshDefinition's fallback
 * would wrongly claim a StructureDefinition URL for every instance. InstanceScopeResolver tests
 * the relevant typed memberships and an unlisted interpretation before exporting. An id can
 * legitimately name different resource types; neither a typeless matching hint nor the startup
 * type-prefix advisory proves which membership applies.
 */
export function instanceScopeKey(fshDefinition: Instance): ArtifactScopeKey {
  const key: ArtifactScopeKey = { id: fshDefinition.id };
  const assignedUrl = getNonInstanceValueFromRules(fshDefinition, 'url', '', 'url');
  if (typeof assignedUrl === 'string') {
    key.url = assignedUrl;
  }
  return key;
}
