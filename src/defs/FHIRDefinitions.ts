// NOTE: This logic is roughly stolen from shr-fhir-export.  It probably could be refined for
// our specific use case.

import cloneDeep from 'lodash/cloneDeep';

export class FHIRDefinitions {
  private extensions: Map<string, any>;
  private resources: Map<string, any>;
  private types: Map<string, any>;
  private valueSets: Map<string, any>;

  constructor(public target: string) {
    this.extensions = new Map();
    this.resources = new Map();
    this.types = new Map();
    this.valueSets = new Map();
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
    if (this.target === '1.0.2') {
      populateMissingIds(definition);
    }

    let type: string;
    if (definition.type) {
      type = definition.type;
    } else if (definition.constrainedType) {
      type = definition.constrainedType;
    } else if (
      definition.snapshot &&
      definition.snapshot.element &&
      definition.snapshot.element[0]
    ) {
      type = definition.snapshot.element[0].path;
    } else {
      type = '';
    }
    const baseDefinition = definition.baseDefinition || definition.base;

    if (
      type == 'Extension' &&
      baseDefinition != 'http://hl7.org/fhir/StructureDefinition/Element'
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
  }
}

// DSTU2 resource definitions don't specify ids for the snapshot elements, but it's easier for us to process everything if they're there.
// So default DSTU2 ids to the path.
function populateMissingIds(definition: any): void {
  const fixId = (element: any) => {
    if (element.id == null) {
      element.id = element.path;
    }
  };
  if (definition.snapshot && definition.snapshot.element) {
    definition.snapshot.element.forEach(fixId);
  }
  if (definition.differential && definition.differential.element) {
    definition.differential.element.forEach(fixId);
  }
}

function addDefinitionToMap(def: any, defMap: Map<string, any>): void {
  if (def.id) {
    defMap.set(def.id, def);
  }
  if (def.url) {
    defMap.set(def.url, def);
  }
}

function cloneJsonMapValues(map: Map<string, any>): any {
  return Array.from(map.values()).map(v => cloneDeep(v));
}
