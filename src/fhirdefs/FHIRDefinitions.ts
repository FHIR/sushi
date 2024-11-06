import { cloneDeep, flatten } from 'lodash';
import {
  FindResourceInfoOptions,
  PackageInfo,
  PackageLoader,
  ResourceInfo,
  byLoadOrder,
  byType
} from 'fhir-package-loader';
import { Type, Metadata, Fishable } from '../utils';
import { BaseFHIRDefinitions, FISHING_ORDER } from './BaseFHIRDefinitions';
import {
  IMPLIED_EXTENSION_REGEX,
  materializeImpliedExtension,
  materializeImpliedExtensionMetadata
} from './impliedExtensions';

const DEFAULT_SORT = [byType(...FISHING_ORDER), byLoadOrder(false)];

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
    const options: FindResourceInfoOptions = {
      type: ['ImplementationGuide'],
      sort: DEFAULT_SORT
    };
    if (fhirPackage) {
      options.scope = fhirPackage;
    }
    return cloneDeep(this.newFPL?.findResourceJSONs('*', options));
  }

  allPredefinedResources(makeClone = true): any[] {
    // Return in FIFO order to match previous SUSHI behavior
    const options = {
      scope: 'sushi-local',
      sort: [byLoadOrder(true)]
    };
    const pdResources = this.newFPL?.findResourceJSONs('*', options) ?? [];
    return makeClone ? pdResources.map(r => cloneDeep(r)) : pdResources;
  }

  allPredefinedResourceMetadatas(): Metadata[] {
    // Return in FIFO order to match previous SUSHI behavior
    const options = {
      scope: 'sushi-local',
      sort: [byLoadOrder(true)]
    };
    return this.newFPL?.findResourceInfos('*', options).map(info => {
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
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
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
    return cloneDeep(this.newFPL?.findPackageInfos(name));
  }

  fishForPredefinedResource(item: string, ...types: Type[]): any | undefined {
    const def = this.newFPL?.findResourceJSON(item, {
      type: normalizeTypes(types),
      scope: 'sushi-local',
      sort: DEFAULT_SORT
    });
    if (def) {
      // TODO: Should FPL clone or leave that to FPL consumers? Or lock objects as READ-ONLY?
      return cloneDeep(def);
    }
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.newFPL?.findResourceInfo(item, {
      type: normalizeTypes(types),
      scope: 'sushi-local',
      sort: DEFAULT_SORT
    });
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
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
        resourcePath: info.resourcePath
      };
    }
  }

  getPackageJson(id: string): any {
    const [name, version] = id.split('#');
    const packageJSON = this.newFPL?.findPackageJSON(name, version);
    if (packageJSON) {
      return cloneDeep(packageJSON);
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = this.newFPL?.findResourceJSON(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
    if (def) {
      return cloneDeep(def);
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtension(item, this);
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.newFPL?.findResourceInfo(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
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
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
        resourcePath: info.resourcePath
      };
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtensionMetadata(item, this);
    }
  }
}

function logicalCharacteristic(info: ResourceInfo, characteristic: string) {
  // only return a value for logicals, otherwise leave it undefined
  if (info.sdFlavor === 'Logical') {
    return info.sdCharacteristics?.some(c => c === characteristic);
  }
}

function normalizeTypes(types: Type[]): Type[] {
  return types?.length ? types : FISHING_ORDER;
}
