// NOTE: This logic is roughly stolen from shr-fhir-export.  It probably could be refined for
// our specific use case.

import cloneDeep from 'lodash/cloneDeep';

export class FHIRDefinitions {
  private extensions: Map<string, any>;
  private resources: Map<string, any>;
  private types: Map<string, any>;
  private valueSets: Map<string, any>;
  packages: string[];

  constructor() {
    this.packages = [];
    this.extensions = new Map();
    this.resources = new Map();
    this.types = new Map();
    this.valueSets = new Map();
  }

  size(): number {
    return this.extensions.size + this.resources.size + this.types.size + this.valueSets.size;
  }

  // NOTE: These all return clones of the JSON to prevent the source values from being overwritten

  allExtensions(): any[] {
    return cloneJsonMapValues(this.extensions);
  }

  findExtension(url: string): any {
    return cloneDeep(this.extensions.get(url));
  }

  allResources(): any[] {
    return cloneJsonMapValues(this.resources);
  }

  findResource(name: string): any {
    return cloneDeep(this.resources.get(name));
  }

  allTypes(): any[] {
    return cloneJsonMapValues(this.types);
  }

  findType(name: string): any {
    return cloneDeep(this.types.get(name));
  }

  allValueSets(): any[] {
    return cloneJsonMapValues(this.valueSets);
  }

  findValueSet(name: string): any {
    return cloneDeep(this.valueSets.get(name));
  }

  find(key: string): any {
    if (this.resources.has(key)) {
      return this.findResource(key);
    } else if (this.types.has(key)) {
      return this.findType(key);
    } else if (this.extensions.has(key)) {
      return this.findExtension(key);
    } else {
      return this.findValueSet(key);
    }
  }

  add(definition: any): void {
    if (
      definition.type == 'Extension' &&
      definition.baseDefinition != 'http://hl7.org/fhir/StructureDefinition/Element'
    ) {
      addDefinitionToMap(definition, this.extensions);
    } else if (
      definition.kind === 'primitive-type' ||
      definition.kind === 'complex-type' ||
      definition.kind === 'datatype'
    ) {
      addDefinitionToMap(definition, this.types);
    } else if (definition.kind == 'resource') {
      addDefinitionToMap(definition, this.resources);
    } else if (definition.resourceType == 'ValueSet') {
      addDefinitionToMap(definition, this.valueSets);
    }
    // TODO: CodeSystems? Other things?
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
