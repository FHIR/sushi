import { flatten } from 'lodash';
import { cloneJsonMapValues, addDefinitionToMap, BaseFHIRDefinitions } from 'fhir-package-load';
import { Type, Metadata, Fishable } from '../utils';
import { IMPLIED_EXTENSION_REGEX, materializeImpliedExtension } from './impliedExtensions';
import { STRUCTURE_DEFINITION_R4_BASE } from '../fhirtypes';

export class FHIRDefinitions extends BaseFHIRDefinitions implements Fishable {
  private predefinedResources: Map<string, any>;
  private supplementalFHIRDefinitions: Map<string, FHIRDefinitions>;
  packages: string[];

  constructor(public readonly isSupplementalFHIRDefinitions = false) {
    super();
    this.packages = [];
    this.predefinedResources = new Map();
    this.supplementalFHIRDefinitions = new Map();
    // FHIR R4 does not have a StructureDefinition that defines "Base" but FHIR R5 does.
    // We have defined a "placeholder" StructureDefinition for "Base" for R4.
    // Inject the R4 "Base" placeholder StructureDefinition
    this.add(STRUCTURE_DEFINITION_R4_BASE);
  }

  // This getter is only used in tests to verify what supplemental packages are loaded
  get supplementalFHIRPackages(): string[] {
    return flatten(
      Array.from(this.supplementalFHIRDefinitions.values()).map(defs => defs.packages)
    );
  }

  allPredefinedResources(): any[] {
    return cloneJsonMapValues(this.predefinedResources);
  }

  add(definition: any): void {
    // For supplemental FHIR versions, we only care about resources and types,
    // but for normal packages, we care about everything.
    if (this.isSupplementalFHIRDefinitions) {
      if (definition.resourceType === 'StructureDefinition') {
        if (
          definition.kind === 'primitive-type' ||
          definition.kind === 'complex-type' ||
          definition.kind === 'datatype'
        ) {
          addDefinitionToMap(definition, this.types);
        } else if (definition.kind === 'resource' && definition.derivation !== 'constraint') {
          addDefinitionToMap(definition, this.resources);
        }
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
}
