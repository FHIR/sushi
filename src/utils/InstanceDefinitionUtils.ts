import remove from 'lodash/remove';
import { InstanceDefinition } from '../fhirtypes';

// NOTE: These functions are intended to filter FHIR resources into the folders supported by the IG Publisher.
// The folders supported can be found here: https://build.fhir.org/ig/FHIR/ig-guidance/using-templates.html#directory-structure

// NOTE: lodash/remove mutates the array passed in to remove any matches. Matches are returned.
// See: https://lodash.com/docs/4.17.15#remove

/**
 * Remove and return any "Inline" instances
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that have Usage set to inline
 */
export function filterInlineInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i._instanceMeta.usage === 'Inline');
}
