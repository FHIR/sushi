import { cloneDeep, flatten } from 'lodash';
import { FHIRDefinitions as BaseFHIRDefinitions } from 'fhir-package-loader';
import { Type, Metadata, Fishable } from '../utils';
import { IMPLIED_EXTENSION_REGEX, materializeImpliedExtension } from './impliedExtensions';
import { R5_DEFINITIONS_NEEDED_IN_R4 } from './R5DefsForR4';
import { LOGICAL_TARGET_EXTENSION, TYPE_CHARACTERISTICS_EXTENSION } from '../fhirtypes/common';

export class FHIRDefinitions extends BaseFHIRDefinitions implements Fishable {
  private predefinedResources: Map<string, any>;
  private supplementalFHIRDefinitions: Map<string, FHIRDefinitions>;

  constructor(public readonly isSupplementalFHIRDefinitions = false) {
    super();
    this.predefinedResources = new Map();
    this.supplementalFHIRDefinitions = new Map();
    // There are several R5 resources that are allowed for use in R4 and R4B.
    // Add them first so they're always available. If a later version is loaded
    // that has these definitions, it will overwrite them, so this should be safe.
    if (!isSupplementalFHIRDefinitions) {
      R5_DEFINITIONS_NEEDED_IN_R4.forEach(def => this.add(def));
    }
  }

  // This getter is only used in tests to verify what supplemental packages are loaded
  get supplementalFHIRPackages(): string[] {
    return flatten(Array.from(this.supplementalFHIRDefinitions.keys()));
  }

  allPredefinedResources(): any[] {
    return Array.from(this.predefinedResources.values()).map(v => cloneDeep(v));
  }

  add(definition: any): void {
    // For supplemental FHIR versions, we only care about resources and types,
    // but for normal packages, we care about everything.
    if (this.isSupplementalFHIRDefinitions) {
      if (
        definition.resourceType === 'StructureDefinition' &&
        (definition.kind === 'primitive-type' ||
          definition.kind === 'complex-type' ||
          definition.kind === 'datatype' ||
          (definition.kind === 'resource' && definition.derivation !== 'constraint'))
      ) {
        super.add(definition);
      }
    } else {
      super.add(definition);
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

  addSupplementalFHIRDefinitions(fhirPackage: string, definitions: FHIRDefinitions): void {
    this.supplementalFHIRDefinitions.set(fhirPackage, definitions);
  }

  getSupplementalFHIRDefinitions(fhirPackage: string): FHIRDefinitions {
    return this.supplementalFHIRDefinitions.get(fhirPackage);
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

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const resource = this.fishForPredefinedResource(item, ...types);
    if (resource) {
      return {
        id: resource.id as string,
        name: resource.name as string,
        sdType: resource.type as string,
        url: resource.url as string,
        parent: resource.baseDefinition as string,
        abstract: resource.abstract as boolean,
        version: resource.version as string,
        resourceType: resource.resourceType as string
      };
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = super.fishForFHIR(item, ...types);
    if (def) {
      return def;
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtension(item, this);
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const result = this.fishForFHIR(item, ...types);
    if (result) {
      let canBeTarget: boolean;
      if (result.resourceType === 'StructureDefinition' && result.kind === 'logical') {
        canBeTarget =
          result.extension?.some((ext: any) => {
            return (
              (ext?.url === TYPE_CHARACTERISTICS_EXTENSION && ext?.valueCode === 'can-be-target') ||
              (ext?.url === LOGICAL_TARGET_EXTENSION && ext?.valueBoolean === true)
            );
          }) ?? false;
      }
      return {
        id: result.id as string,
        name: result.name as string,
        sdType: result.type as string,
        url: result.url as string,
        parent: result.baseDefinition as string,
        abstract: result.abstract as boolean,
        version: result.version as string,
        resourceType: result.resourceType as string,
        canBeTarget
      };
    }
  }
}
