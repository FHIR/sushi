import { cloneDeep, flatten } from 'lodash';
import { FindResourceInfoOptions, PackageInfo, PackageLoader } from 'fhir-package-loader';
import { Type, Metadata, Fishable } from '../utils';
import { BaseFHIRDefinitions } from './BaseFHIRDefinitions';
import { IMPLIED_EXTENSION_REGEX, materializeImpliedExtension } from './impliedExtensions';

export class FHIRDefinitions extends BaseFHIRDefinitions implements Fishable {
  private supplementalFHIRDefinitions: Map<string, FHIRDefinitions>;

  constructor(
    public readonly isSupplementalFHIRDefinitions = false,
    public readonly newFPL?: PackageLoader
  ) {
    super();
    this.supplementalFHIRDefinitions = new Map();
  }

  // This getter is only used in tests to verify what supplemental packages are loaded
  get supplementalFHIRPackages(): string[] {
    return flatten(Array.from(this.supplementalFHIRDefinitions.keys()));
  }

  allImplementationGuides(fhirPackage?: string): any[] {
    const options: FindResourceInfoOptions = { type: ['ImplementationGuide'] };
    if (fhirPackage) {
      options.scope = fhirPackage;
    }
    return this.newFPL?.findResourceJSONs('*', options);
  }

  // TODO: Should we be cloning resources in other methods calling FPL?
  allPredefinedResources(makeClone = true): any[] {
    const pdResources = this.newFPL?.findResourceJSONs('*', { scope: 'sushi-local' }) ?? [];
    return makeClone ? pdResources.map(r => cloneDeep(r)) : pdResources;
  }

  allPredefinedResourceMetadatas(): Metadata[] {
    return this.newFPL?.findResourceInfos('*', { scope: 'sushi-local' }).map(info => {
      return {
        id: info.id,
        name: info.name,
        sdType: info.sdType,
        url: info.url,
        parent: info.sdBaseDefinition,
        imposeProfiles: info.sdImposeProfiles,
        abstract: info.sdAbstract,
        version: info.version,
        resourceType: info.resourceType,
        canBeTarget: info.sdCharacteristics?.some(c => c === 'can-be-target'),
        canBind: info.sdCharacteristics?.some(c => c === 'can-bind'),
        resourcePath: info.resourcePath
      };
    });
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPredefinedResource(file: string): any {
    return null;
  }

  addSupplementalFHIRDefinitions(fhirPackage: string, definitions: FHIRDefinitions): void {
    this.supplementalFHIRDefinitions.set(fhirPackage, definitions);
  }

  getSupplementalFHIRDefinitions(fhirPackage: string): FHIRDefinitions {
    return this.supplementalFHIRDefinitions.get(fhirPackage);
  }

  fishForPackageInfos(name: string): PackageInfo[] {
    return this.newFPL?.findPackageInfos(name);
  }

  fishForPredefinedResource(item: string, ...types: Type[]): any | undefined {
    const def = this.newFPL?.findResourceJSON(item, { type: types, scope: 'sushi-local' });
    if (def) {
      // TODO: Should FPL clone or leave that to FPL consumers? Or lock objects as READ-ONLY?
      return cloneDeep(def);
    }
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.newFPL?.findResourceInfo(item, { type: types, scope: 'sushi-local' });
    if (info) {
      return {
        id: info.id,
        name: info.name,
        sdType: info.sdType,
        url: info.url,
        parent: info.sdBaseDefinition,
        imposeProfiles: info.sdImposeProfiles,
        abstract: info.sdAbstract,
        version: info.version,
        resourceType: info.resourceType,
        canBeTarget: info.sdCharacteristics?.some(c => c === 'can-be-target'),
        canBind: info.sdCharacteristics?.some(c => c === 'can-bind'),
        resourcePath: info.resourcePath
      };
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = this.newFPL?.findResourceJSON(item, { type: types });
    if (def) {
      return def;
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtension(item, this);
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.newFPL?.findResourceInfo(item, { type: types });
    if (info) {
      return {
        id: info.id,
        name: info.name,
        sdType: info.sdType,
        url: info.url,
        parent: info.sdBaseDefinition,
        imposeProfiles: info.sdImposeProfiles,
        abstract: info.sdAbstract,
        version: info.version,
        resourceType: info.resourceType,
        canBeTarget: info.sdCharacteristics?.some(c => c === 'can-be-target'),
        canBind: info.sdCharacteristics?.some(c => c === 'can-bind'),
        resourcePath: info.resourcePath
      };
    }
  }
}
