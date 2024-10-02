import { cloneDeep, flatten } from 'lodash';
import { FindResourceInfoOptions, PackageInfo, PackageLoader } from 'fhir-package-loader';
import { Type, Metadata, Fishable } from '../utils';
import { BaseFHIRDefinitions } from './BaseFHIRDefinitions';
import { IMPLIED_EXTENSION_REGEX, materializeImpliedExtension } from './impliedExtensions';
import { R5_DEFINITIONS_NEEDED_IN_R4 } from './R5DefsForR4';

export class FHIRDefinitions extends BaseFHIRDefinitions implements Fishable {
  //private predefinedResources: Map<string, any>;
  private supplementalFHIRDefinitions: Map<string, FHIRDefinitions>;

  constructor(
    public readonly isSupplementalFHIRDefinitions = false,
    public readonly newFPL?: PackageLoader
  ) {
    super();
    //this.predefinedResources = new Map();
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

  allImplementationGuides(fhirPackage?: string): any[] {
    const options: FindResourceInfoOptions = { type: ['ImplementationGuide'] };
    if (fhirPackage) {
      options.scope = fhirPackage;
    }
    const igs = this.newFPL?.findResourceJSONs('*', options);
    console.error(`FIND IGs w/ options ${options}`, igs.length);
    return this.newFPL?.findResourceJSONs('*', options);
  }

  // TODO: Should we be cloning resources in other methods calling FPL?
  allPredefinedResources(makeClone = true): any[] {
    const pdResources = this.newFPL?.findResourceJSONs('*', { scope: 'LOCAL' }) ?? [];
    return makeClone ? pdResources.map(r => cloneDeep(r)) : pdResources;
  }

  allPredefinedResourceMetadatas(): Metadata[] {
    return this.newFPL?.findResourceInfos('*', { scope: 'LOCAL' }).map(info => {
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

  getPredefinedResource(file: string): any {
    file;
    return null;
  }

  resetPredefinedResources() {
    //this.predefinedResources = new Map();
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
    const def = this.newFPL?.findResourceJSON(item, { type: types, scope: 'LOCAL' });
    if (def) {
      // logger.info(`@@@ NEW FPL SUSHI @@@ Found ${item} with types: ${types}`);
      // TODO: Should FPL clone or leave that to FPL consumers? Or lock objects as READ-ONLY?
      return cloneDeep(def);
    }
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.newFPL?.findResourceInfo(item, { type: types, scope: 'LOCAL' });
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
      // logger.info(`@@@ NEW FPL SUSHI @@@ Found ${item} with types: ${types}`);
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
