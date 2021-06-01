import { Type, Metadata, Fishable } from '../utils/Fishable';
import cloneDeep from 'lodash/cloneDeep';
import { STRUCTURE_DEFINITION_R4_BASE } from '../fhirtypes';

export class FHIRDefinitions implements Fishable {
  private resources: Map<string, any>;
  private logicals: Map<string, any>;
  private profiles: Map<string, any>;
  private extensions: Map<string, any>;
  private types: Map<string, any>;
  private valueSets: Map<string, any>;
  private codeSystems: Map<string, any>;
  private implementationGuides: Map<string, any>;
  private predefinedResources: Map<string, any>;
  packages: string[];

  constructor() {
    this.packages = [];
    this.resources = new Map();
    this.logicals = new Map();
    this.profiles = new Map();
    this.extensions = new Map();
    this.types = new Map();
    this.valueSets = new Map();
    this.codeSystems = new Map();
    this.implementationGuides = new Map();
    this.predefinedResources = new Map();

    // FHIR R4 does not have a StructureDefinition that defines "Base" but FHIR R5 does.
    // We have defined a "placeholder" StructureDefinition for "Base" for R4.
    // Inject the R4 "Base" placeholder StructureDefinition
    this.add(JSON.stringify(STRUCTURE_DEFINITION_R4_BASE));
  }

  size(): number {
    return (
      this.resources.size +
      this.logicals.size +
      this.profiles.size +
      this.extensions.size +
      this.types.size +
      this.valueSets.size +
      this.codeSystems.size +
      this.implementationGuides.size
    );
  }

  // NOTE: These all return clones of the JSON to prevent the source values from being overwritten

  allResources(): any[] {
    return cloneJsonMapValues(this.resources);
  }

  allLogicals(): any[] {
    return cloneJsonMapValues(this.logicals);
  }

  allProfiles(): any[] {
    return cloneJsonMapValues(this.profiles);
  }

  allExtensions(): any[] {
    return cloneJsonMapValues(this.extensions);
  }

  allTypes(): any[] {
    return cloneJsonMapValues(this.types);
  }

  allValueSets(): any[] {
    return cloneJsonMapValues(this.valueSets);
  }

  allCodeSystems(): any[] {
    return cloneJsonMapValues(this.codeSystems);
  }

  allImplementationGuides(): any[] {
    return cloneJsonMapValues(this.implementationGuides);
  }

  allPredefinedResources(): any[] {
    return cloneJsonMapValues(this.predefinedResources);
  }

  add(definition: any): void {
    if (definition.resourceType === 'StructureDefinition') {
      if (
        definition.type === 'Extension' &&
        definition.baseDefinition !== 'http://hl7.org/fhir/StructureDefinition/Element'
      ) {
        addDefinitionToMap(definition, this.extensions);
      } else if (
        definition.kind === 'primitive-type' ||
        definition.kind === 'complex-type' ||
        definition.kind === 'datatype'
      ) {
        addDefinitionToMap(definition, this.types);
      } else if (definition.kind === 'resource') {
        if (definition.derivation === 'constraint') {
          addDefinitionToMap(definition, this.profiles);
        } else {
          addDefinitionToMap(definition, this.resources);
        }
      } else if (definition.kind === 'logical') {
        addDefinitionToMap(definition, this.logicals);
      }
    } else if (definition.resourceType === 'ValueSet') {
      addDefinitionToMap(definition, this.valueSets);
    } else if (definition.resourceType === 'CodeSystem') {
      addDefinitionToMap(definition, this.codeSystems);
    } else if (definition.resourceType === 'ImplementationGuide') {
      addDefinitionToMap(definition, this.implementationGuides);
    }
  }

  addPredefinedResource(file: string, definition: any): void {
    this.predefinedResources.set(file, definition);
  }

  getPredefinedResource(file: string): any {
    return this.predefinedResources.get(file);
  }

  resetPredefinedResources() {
    this.predefinedResources = new Map();
  }

  fishForPredefinedResource(item: string, ...types: Type[]): any | undefined {
    const resource = this.fishForFHIR(item, ...types);
    if (
      resource &&
      this.allPredefinedResources().find(
        predefResource =>
          predefResource.id === resource.id &&
          predefResource.resourceType === resource.resourceType &&
          predefResource.url === resource.url
      )
    ) {
      return resource;
    }
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): any | undefined {
    const resource = this.fishForPredefinedResource(item, ...types);
    if (resource) {
      return {
        id: resource.id as string,
        name: resource.name as string,
        sdType: resource.type as string,
        url: resource.url as string,
        parent: resource.baseDefinition as string,
        abstract: resource.abstract as boolean
      };
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // No types passed in means to search ALL supported types
    if (types.length === 0) {
      types = [
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.ValueSet,
        Type.CodeSystem
      ];
    }

    for (const type of types) {
      let def;
      switch (type) {
        case Type.Resource:
          def = cloneDeep(this.resources.get(item));
          break;
        case Type.Logical:
          def = cloneDeep(this.logicals.get(item));
          break;
        case Type.Type:
          def = cloneDeep(this.types.get(item));
          break;
        case Type.Profile:
          def = cloneDeep(this.profiles.get(item));
          break;
        case Type.Extension:
          def = cloneDeep(this.extensions.get(item));
          break;
        case Type.ValueSet:
          def = cloneDeep(this.valueSets.get(item));
          break;
        case Type.CodeSystem:
          def = cloneDeep(this.codeSystems.get(item));
          break;
        case Type.Instance: // don't support resolving to FHIR instances
        default:
          break;
      }
      if (def) {
        return def;
      }
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fishForFHIR(item, ...types);
    if (result) {
      return {
        id: result.id as string,
        name: result.name as string,
        sdType: result.type as string,
        url: result.url as string,
        parent: result.baseDefinition as string,
        abstract: result.abstract as boolean
      };
    }
  }
}

function addDefinitionToMap(def: any, defMap: Map<string, any>): void {
  if (def.id) {
    defMap.set(def.id, def);
  }
  if (def.url) {
    defMap.set(def.url, def);
  }
  if (def.name) {
    defMap.set(def.name, def);
  }
}

function cloneJsonMapValues(map: Map<string, any>): any {
  return Array.from(map.values()).map(v => cloneDeep(v));
}
