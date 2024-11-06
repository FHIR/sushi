// NOTE: This is the original FHIRDefinitions class from fhir-package-loader 1.0.
// This class was removed in fhir-package-loader 2.0, so we have it here as a
// temporary measure while we transition fully to fhir-package-loader 2.0.

import { cloneDeep, isEqual, uniqWith, uniq } from 'lodash';

/** Class representing the FHIR definitions in one or more FHIR packages */
export class BaseFHIRDefinitions {
  protected resources: Map<string, any>;
  protected logicals: Map<string, any>;
  protected profiles: Map<string, any>;
  protected extensions: Map<string, any>;
  protected types: Map<string, any>;
  protected valueSets: Map<string, any>;
  protected codeSystems: Map<string, any>;
  protected implementationGuides: Map<string, any>;
  protected packageJsons: Map<string, any>;
  childFHIRDefs: BaseFHIRDefinitions[];
  package: string;
  unsuccessfulPackageLoad: boolean;

  /** Create a FHIRDefinitions */
  constructor() {
    this.package = '';
    this.resources = new DoubleMap();
    this.logicals = new DoubleMap();
    this.profiles = new DoubleMap();
    this.extensions = new DoubleMap();
    this.types = new DoubleMap();
    this.valueSets = new DoubleMap();
    this.codeSystems = new DoubleMap();
    this.implementationGuides = new DoubleMap();
    this.packageJsons = new DoubleMap();
    this.childFHIRDefs = [];
    this.unsuccessfulPackageLoad = false;
  }

  /** Get the total number of definitions */
  size(): number {
    return (
      this.allResources().length +
      this.allLogicals().length +
      this.allProfiles().length +
      this.allExtensions().length +
      this.allTypes().length +
      this.allValueSets().length +
      this.allCodeSystems().length +
      this.allImplementationGuides().length
    );
  }

  // NOTE: These all return clones of the JSON to prevent the source values from being overwritten

  /**
   * Get all resources. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of resources
   */
  allResources(fhirPackage?: string): any[] {
    if (
      (this.resources.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectResources(fhirPackage), isEqual);
    }
    return this.collectResources(fhirPackage);
  }

  protected collectResources(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectResources(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let resources = this.resources;
    if (fhirPackage) {
      resources = new Map();
      if (this.package === fhirPackage) {
        resources = this.resources;
      }
    }
    return cloneJsonMapValues(resources).concat(childValues);
  }

  /**
   * Get all logicals. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of logicals
   */
  allLogicals(fhirPackage?: string): any[] {
    if (
      (this.logicals.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectLogicals(fhirPackage), isEqual);
    }
    return uniqWith(this.collectLogicals(fhirPackage), isEqual);
  }

  protected collectLogicals(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectLogicals(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let logicals = this.logicals;
    if (fhirPackage) {
      logicals = new Map();
      if (this.package === fhirPackage) {
        logicals = this.logicals;
      }
    }
    return cloneJsonMapValues(logicals).concat(childValues);
  }

  /**
   * Get all profiles. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of profiles
   */
  allProfiles(fhirPackage?: string): any[] {
    if (
      (this.profiles.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectProfiles(fhirPackage), isEqual);
    }
    return this.collectProfiles(fhirPackage);
  }

  protected collectProfiles(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectProfiles(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let profiles = this.profiles;
    if (fhirPackage) {
      profiles = new Map();
      if (this.package === fhirPackage) {
        profiles = this.profiles;
      }
    }
    return cloneJsonMapValues(profiles).concat(childValues);
  }

  /**
   * Get all extensions. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of extensions
   */
  allExtensions(fhirPackage?: string): any[] {
    if (
      (this.extensions.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectExtensions(fhirPackage), isEqual);
    }
    return this.collectExtensions(fhirPackage);
  }

  protected collectExtensions(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectExtensions(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let extensions = this.extensions;
    if (fhirPackage) {
      extensions = new Map();
      if (this.package === fhirPackage) {
        extensions = this.extensions;
      }
    }
    return cloneJsonMapValues(extensions).concat(childValues);
  }

  /**
   * Get all types. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of types
   */
  allTypes(fhirPackage?: string): any[] {
    if ((this.types.size > 0 && this.childFHIRDefs.length > 0) || this.childFHIRDefs.length > 1) {
      return uniqWith(this.collectTypes(fhirPackage), isEqual);
    }
    return this.collectTypes(fhirPackage);
  }

  protected collectTypes(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectTypes(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let types = this.types;
    if (fhirPackage) {
      types = new Map();
      if (this.package === fhirPackage) {
        types = this.types;
      }
    }
    return cloneJsonMapValues(types).concat(childValues);
  }

  /**
   * Get all value sets. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of value sets
   */
  allValueSets(fhirPackage?: string): any[] {
    if (
      (this.valueSets.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectValueSets(fhirPackage), isEqual);
    }
    return this.collectValueSets(fhirPackage);
  }

  protected collectValueSets(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectValueSets(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let valueSets = this.valueSets;
    if (fhirPackage) {
      valueSets = new Map();
      if (this.package === fhirPackage) {
        valueSets = this.valueSets;
      }
    }
    return cloneJsonMapValues(valueSets).concat(childValues);
  }

  /**
   * Get all code systems. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of code systems
   */
  allCodeSystems(fhirPackage?: string): any[] {
    if (
      (this.codeSystems.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectCodeSystems(fhirPackage), isEqual);
    }
    return this.collectCodeSystems(fhirPackage);
  }

  protected collectCodeSystems(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectCodeSystems(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let codeSystems = this.codeSystems;
    if (fhirPackage) {
      codeSystems = new Map();
      if (this.package === fhirPackage) {
        codeSystems = this.codeSystems;
      }
    }
    return cloneJsonMapValues(codeSystems).concat(childValues);
  }

  /**
   * Get all implementation guides. The array will not contain duplicates.
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of implementation guides
   */
  allImplementationGuides(fhirPackage?: string): any[] {
    if (
      (this.implementationGuides.size > 0 && this.childFHIRDefs.length > 0) ||
      this.childFHIRDefs.length > 1
    ) {
      return uniqWith(this.collectImplementationGuides(fhirPackage), isEqual);
    }
    return this.collectImplementationGuides(fhirPackage);
  }

  protected collectImplementationGuides(fhirPackage?: string): any[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectImplementationGuides(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    let implementationGuides = this.implementationGuides;
    if (fhirPackage) {
      implementationGuides = new Map();
      if (this.package === fhirPackage) {
        implementationGuides = this.implementationGuides;
      }
    }
    return cloneJsonMapValues(implementationGuides).concat(childValues);
  }

  /**
   * Get a list of packages that encountered errors while downloaded and were not loaded
   * @param {string} [fhirPackage] - The package (packageId#version) to search in. If not provided, searches all packages.
   * @returns array of packages (packageId#version) that were not successfully loaded
   */
  allUnsuccessfulPackageLoads(fhirPackage?: string): string[] {
    return uniq(this.collectUnsuccessfulPackageLoads(fhirPackage));
  }

  protected collectUnsuccessfulPackageLoads(fhirPackage?: string): string[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectUnsuccessfulPackageLoads(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    if (fhirPackage) {
      if (this.package === fhirPackage && this.unsuccessfulPackageLoad) {
        return childValues.concat(this.package);
      }
    } else if (this.unsuccessfulPackageLoad) {
      return childValues.concat(this.package);
    }
    return childValues;
  }

  /**
   * Get a list of all packages that are contained in this FHIRDefinitions
   * @param {string} [fhirPackage] The package (packageId#version) to get all packages from. If not provided, all packages are returned.
   * @returns array of packages (packageId#version) that are loaded
   */
  allPackages(fhirPackage?: string): string[] {
    return uniq(this.collectPackages(fhirPackage));
  }

  protected collectPackages(fhirPackage?: string): string[] {
    const childValues = this.childFHIRDefs
      .map(def => def.collectPackages(fhirPackage))
      .reduce((a, b) => a.concat(b), []);
    if (fhirPackage) {
      if (this.package === fhirPackage && this.package !== '') {
        return childValues.concat(this.package);
      }
    } else if (this.package !== '') {
      return childValues.concat(this.package);
    }
    return childValues;
  }

  /**
   * Add a definition
   * @param definition - The definition to add
   */
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
        if (definition.derivation === 'specialization') {
          addDefinitionToMap(definition, this.logicals);
        } else {
          addDefinitionToMap(definition, this.profiles);
        }
      }
    } else if (definition.resourceType === 'ValueSet') {
      addDefinitionToMap(definition, this.valueSets);
    } else if (definition.resourceType === 'CodeSystem') {
      addDefinitionToMap(definition, this.codeSystems);
    } else if (definition.resourceType === 'ImplementationGuide') {
      addDefinitionToMap(definition, this.implementationGuides);
    }
  }

  /**
   * Add a package.json
   * @param {string} id - package id
   * @param {string} definition - package JSON definition
   */
  addPackageJson(id: string, definition: any): void {
    this.packageJsons.set(id, definition);
  }

  /**
   * Get a package's package.json
   * @param {string} id - package id
   * @returns package.json definition
   */
  getPackageJson(id: string): any {
    return this.packageJsons.get(id);
  }

  /**
   * Private function for search through current FHIRDefinitions and all childFHIRDefs
   * for a specified definition. Uses get for efficient retrieves.
   * Breath-first search through childFHIRDefinitions for the item.
   * @param item name, id, or url of definition to find
   * @param map name of the map to search in
   * @returns definition or undefined if it is not found
   */
  private getDefinition(item: string, map: maps): any | undefined {
    const defsToSearch: BaseFHIRDefinitions[] = [this];
    while (defsToSearch.length > 0) {
      const currentFHIRDefs = defsToSearch.shift();
      const [base, ...versionParts] = item?.split('|') ?? ['', ''];
      const version = versionParts.join('|') || null;
      const def = currentFHIRDefs[map].get(base);
      if (def) {
        if (version == null || version === def?.version) {
          // Only return the found definition if the version matches (if provided)
          return def;
        }
      }
      if (currentFHIRDefs.childFHIRDefs.length > 0) {
        defsToSearch.push(...currentFHIRDefs.childFHIRDefs);
      }
    }

    return;
  }

  /**
   * Search for a definition based on the type it could be
   * @param {string} item - the item to search for
   * @param {Type[]} types - the possible type the item could be
   * @returns the definition that is returned or undefined if none is found
   */
  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    // No types passed in means to search ALL supported types
    if (types.length === 0) {
      types = FISHING_ORDER;
    } else {
      types.sort((a, b) => FISHING_ORDER.indexOf(a) - FISHING_ORDER.indexOf(b));
    }

    for (const type of types) {
      let def;
      switch (type) {
        case Type.Resource:
          def = cloneDeep(this.getDefinition(item, 'resources'));
          break;
        case Type.Logical:
          def = cloneDeep(this.getDefinition(item, 'logicals'));
          break;
        case Type.Type:
          def = cloneDeep(this.getDefinition(item, 'types'));
          break;
        case Type.Profile:
          def = cloneDeep(this.getDefinition(item, 'profiles'));
          break;
        case Type.Extension:
          def = cloneDeep(this.getDefinition(item, 'extensions'));
          break;
        case Type.ValueSet:
          def = cloneDeep(this.getDefinition(item, 'valueSets'));
          break;
        case Type.CodeSystem:
          def = cloneDeep(this.getDefinition(item, 'codeSystems'));
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

export enum Type {
  Profile = 'Profile',
  Extension = 'Extension',
  ValueSet = 'ValueSet',
  CodeSystem = 'CodeSystem',
  Instance = 'Instance',
  Invariant = 'Invariant', // NOTE: only defined in FSHTanks, not FHIR defs
  RuleSet = 'RuleSet', // NOTE: only defined in FSHTanks, not FHIR defs
  Mapping = 'Mapping', // NOTE: only defined in FSHTanks, not FHIR defs
  Resource = 'Resource',
  Type = 'Type', // NOTE: only defined in FHIR defs, not FSHTanks
  Logical = 'Logical'
}

export const FISHING_ORDER = [
  Type.Resource,
  Type.Logical,
  Type.Type,
  Type.Profile,
  Type.Extension,
  Type.ValueSet,
  Type.CodeSystem
];

// Type to represent the names of the FHIRDefinition maps of definitions
type maps =
  | 'resources'
  | 'logicals'
  | 'profiles'
  | 'extensions'
  | 'types'
  | 'valueSets'
  | 'codeSystems';

/**
 * The DoubleMap is a Map that contains both forward and reverse mappings between keys and values.
 * This allows the DoubleMap to easily provide a list of unique values,
 * because each value in the internal forwardMap will be a key in the reverseMap.
 * The reported size of a DoubleMap is the number of unique values,
 * which is the number of keys in the reverseMap.
 *
 * Note that because DoubleMap.values() returns the keys from reverseMap,
 * it may contain fewer elements than the other functions: keys(), entries(), forEach(), and the for-of iterator.
 */
export class DoubleMap<K, V> implements Map<K, V> {
  private forwardMap: Map<K, V>;
  private reverseMap: Map<V, Set<K>>;

  constructor() {
    this.forwardMap = new Map();
    this.reverseMap = new Map();
  }

  set(key: K, value: V): this {
    if (this.forwardMap.get(key) === value) {
      return this;
    }
    this.delete(key);
    this.forwardMap.set(key, value);
    if (this.reverseMap.has(value)) {
      this.reverseMap.get(value).add(key);
    } else {
      this.reverseMap.set(value, new Set([key]));
    }
    return this;
  }

  delete(key: K): boolean {
    if (this.forwardMap.has(key)) {
      const currentValue = this.forwardMap.get(key);
      const currentKeys = this.reverseMap.get(currentValue);
      currentKeys.delete(key);
      if (currentKeys.size === 0) {
        this.reverseMap.delete(currentValue);
      }
      this.forwardMap.delete(key);
      return true;
    } else {
      return false;
    }
  }

  get(key: K): V {
    return this.forwardMap.get(key);
  }

  get size(): number {
    return this.reverseMap.size;
  }

  clear(): void {
    this.forwardMap.clear();
    this.reverseMap.clear();
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.forwardMap.forEach(callbackfn, thisArg);
  }

  has(key: K): boolean {
    return this.forwardMap.has(key);
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  entries(): IterableIterator<[K, V]> {
    return this.forwardMap.entries();
  }

  keys(): IterableIterator<K> {
    return this.forwardMap.keys();
  }

  values(): IterableIterator<V> {
    return this.reverseMap.keys();
  }

  [Symbol.toStringTag]: string;
}
