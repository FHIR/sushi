import remove from 'lodash/remove';
import { InstanceDefinition } from '../fhirtypes';
// NOTE: lodash/remove mutates the array passed in to remove any matches. Matches are returned.
// See: https://lodash.com/docs/4.17.15#remove
export function filterExampleInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i => i._instanceMeta.usage === 'Example' || i._instanceMeta.usage === undefined
  );
}

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

export function filterOperationInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i.resourceType === 'OperationDefinition');
}

export function filterModelInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(instances, i => i.resourceType === 'StructureDefinition' && i.kind === 'logical');
}

export function filterExtensionInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i => i.resourceType === 'StructureDefinition' && i.kind === 'resource' && i.type === 'Extension'
  );
}

export function filterProfileInstances(instances: InstanceDefinition[]): InstanceDefinition[] {
  return remove(
    instances,
    i => i.resourceType === 'StructureDefinition' && i.kind === 'resource' && i.type !== 'Extension'
  );
}
