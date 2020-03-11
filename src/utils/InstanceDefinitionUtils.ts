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

/**
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that have Usage set to example
 */
export function filterExampleInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i._instanceMeta.usage === 'Example');
}

/**
 * The capabilities folder will include any resource type in the 'Conformance' category of FHIR resources,
 * not including StructureDefinition or OperationDefinition, as those resources should be in other folders
 * @see {@link https://www.hl7.org/fhir/resourcelist.html}
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'capabilities' folder for IG Publisher input
 */
export function filterCapabilitiesInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i =>
      i.resourceType === 'CapabilityStatement' ||
      i.resourceType === 'ImplementationGuide' ||
      i.resourceType === 'SearchParameter' ||
      i.resourceType === 'MessageDefinition' ||
      i.resourceType === 'CompartmentDefinition' ||
      i.resourceType === 'StructureMap' ||
      i.resourceType === 'GraphDefinition' ||
      i.resourceType === 'ExampleScenario'
  );
}

/**
 * The vocabulary folder will include any resource type in the 'Terminology' category of FHIR resources
 * @see {@link https://www.hl7.org/fhir/resourcelist.html}
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'vocabulary' folder for IG Publisher input
 */
export function filterVocabularyInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i =>
      i.resourceType === 'CodeSystem' ||
      i.resourceType === 'ValueSet' ||
      i.resourceType === 'ConceptMap' ||
      i.resourceType === 'NamingSystem' ||
      i.resourceType === 'TerminologyCapabilities'
  );
}

/**
 * The operation folder will include the OperationDefinition resource
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'operations' folder for IG Publisher input
 */
export function filterOperationInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i.resourceType === 'OperationDefinition');
}

/**
 * The model folder will include the logical model resources (StructureDefinitions that have kind` set to 'logical')
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'models' folder for IG Publisher input
 */
export function filterModelInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i.resourceType === 'StructureDefinition' && i.kind === 'logical');
}

/**
 * The extension folder will include any instances of Extensions (StructureDefinitions with type set to 'Extension')
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'extensions' folder for IG Publisher input
 */
export function filterExtensionInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i => i.resourceType === 'StructureDefinition' && i.kind === 'resource' && i.type === 'Extension'
  );
}

/**
 * The profile folder will include any instances of Profiles (StructureDefinitions with type not set to 'Extension')
 *
 * @param {InstanceDefinition[]} instances - the list of InstanceDefinitions to filter. Will be mutated.
 * @returns {InstanceDefinition[]} - InstanceDefinitions that should be in the 'profiles' folder for IG Publisher input
 */
export function filterProfileInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i => i.resourceType === 'StructureDefinition' && i.kind === 'resource' && i.type !== 'Extension'
  );
}
