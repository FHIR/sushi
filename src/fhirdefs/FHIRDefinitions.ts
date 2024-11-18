import { cloneDeep, flatten } from 'lodash';
import { Database } from 'sql.js';
import {
  BasePackageLoaderOptions,
  CurrentBuildClient,
  FindResourceInfoOptions,
  PackageCache,
  PackageDB,
  PackageInfo,
  RegistryClient,
  ResourceInfo,
  byLoadOrder,
  byType
} from 'fhir-package-loader';
import { PREDEFINED_PACKAGE_NAME } from '../ig';
import { Type, Metadata, Fishable, logger } from '../utils';
import { BaseFHIRDefinitions, FISHING_ORDER } from './BaseFHIRDefinitions';
import {
  IMPLIED_EXTENSION_REGEX,
  materializeImpliedExtension,
  materializeImpliedExtensionMetadata
} from './impliedExtensions';
import initSqlJs from 'sql.js';

const DEFAULT_SORT = [byType(...FISHING_ORDER), byLoadOrder(false)];

export class FHIRDefinitions extends BaseFHIRDefinitions implements Fishable {
  private supplementalFHIRDefinitions: Map<string, FHIRDefinitions>;

  constructor(
    sqlDB: Database,
    public readonly isSupplementalFHIRDefinitions = false,
    private supplementalFHIRDefinitionsFactory?: () => Promise<FHIRDefinitions>,
    // override is mainly intended to be used in unit tests
    override?: {
      packageDB?: PackageDB;
      packageCache?: PackageCache;
      registryClient?: RegistryClient;
      currentBuildClient?: CurrentBuildClient;
      options?: BasePackageLoaderOptions;
    }
  ) {
    super(sqlDB, override);
    this.supplementalFHIRDefinitions = new Map();
    if (!supplementalFHIRDefinitionsFactory) {
      this.supplementalFHIRDefinitionsFactory = async () => {
        const SQL = await initSqlJs();
        return new FHIRDefinitions(new SQL.Database(), true);
      };
    }
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
    return cloneDeep(this.findResourceJSONs('*', options));
  }

  allPredefinedResources(makeClone = true): any[] {
    // Return in FIFO order to match previous SUSHI behavior
    const options = {
      scope: PREDEFINED_PACKAGE_NAME,
      sort: [byLoadOrder(true)]
    };
    const pdResources = this.findResourceJSONs('*', options) ?? [];
    return makeClone ? pdResources.map(r => cloneDeep(r)) : pdResources;
  }

  allPredefinedResourceMetadatas(): Metadata[] {
    // Return in FIFO order to match previous SUSHI behavior
    const options = {
      scope: PREDEFINED_PACKAGE_NAME,
      sort: [byLoadOrder(true)]
    };
    return this.findResourceInfos('*', options).map(info => {
      return {
        id: info.id || undefined,
        name: info.name || undefined,
        sdType: info.sdType || undefined,
        url: info.url || undefined,
        parent: info.sdBaseDefinition || undefined,
        imposeProfiles: info.sdImposeProfiles || undefined,
        abstract: info.sdAbstract != null ? info.sdAbstract : undefined,
        version: info.version || undefined,
        resourceType: info.resourceType || undefined,
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
        resourcePath: info.resourcePath || undefined
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

  /**
   * Loads a "supplemental" FHIR package other than the primary FHIR version being used. This is
   * needed to support extensions for converting between versions (e.g., "implied" extensions).
   * The definitions from the supplemental FHIR package are not loaded into the main set of
   * definitions, but rather, are loaded into their own private FHIRDefinitions.
   * @param fhirPackage - the FHIR package to load in the format {packageId}#{version}
   * @returns Promise<void> promise that always resolves successfully (even if there is an error)
   */
  async loadSupplementalFHIRPackage(fhirPackage: string): Promise<void> {
    const supplementalDefs = await this.supplementalFHIRDefinitionsFactory();
    const [fhirPackageId, fhirPackageVersion] = fhirPackage.split('#');
    await supplementalDefs
      .loadPackage(fhirPackageId, fhirPackageVersion)
      .then(status => {
        if (status == 'LOADED') {
          this.addSupplementalFHIRDefinitions(fhirPackage, supplementalDefs);
        }
      })
      .catch(e => {
        logger.error(`Failed to load supplemental FHIR package ${fhirPackage}: ${e.message}`);
        if (e.stack) {
          logger.debug(e.stack);
        }
      });
  }

  fishForPackageInfos(name: string): PackageInfo[] {
    return cloneDeep(this.findPackageInfos(name));
  }

  fishForPredefinedResource(item: string, ...types: Type[]): any | undefined {
    const def = this.findResourceJSON(item, {
      type: normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
    if (def) {
      // TODO: Should FPL clone or leave that to FPL consumers? Or lock objects as READ-ONLY?
      return cloneDeep(def);
    }
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.findResourceInfo(item, {
      type: normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
    if (info) {
      return {
        id: info.id || undefined,
        name: info.name || undefined,
        sdType: info.sdType || undefined,
        url: info.url || undefined,
        parent: info.sdBaseDefinition || undefined,
        imposeProfiles: info.sdImposeProfiles || undefined,
        abstract: info.sdAbstract != null ? info.sdAbstract : undefined,
        version: info.version || undefined,
        resourceType: info.resourceType || undefined,
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
        resourcePath: info.resourcePath || undefined
      };
    }
  }

  getPackageJson(id: string): any {
    const [name, version] = id.split('#');
    const packageJSON = this.findPackageJSON(name, version);
    if (packageJSON) {
      return cloneDeep(packageJSON);
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = this.findResourceJSON(item, {
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
    const info = this.findResourceInfo(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
    if (info) {
      return {
        id: info.id || undefined,
        name: info.name || undefined,
        sdType: info.sdType || undefined,
        url: info.url || undefined,
        parent: info.sdBaseDefinition || undefined,
        imposeProfiles: info.sdImposeProfiles || undefined,
        abstract: info.sdAbstract != null ? info.sdAbstract : undefined,
        version: info.version || undefined,
        resourceType: info.resourceType || undefined,
        canBeTarget: logicalCharacteristic(info, 'can-be-target'),
        canBind: logicalCharacteristic(info, 'can-bind'),
        resourcePath: info.resourcePath || undefined
      };
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtensionMetadata(item, this);
    }
  }
}

function logicalCharacteristic(info: ResourceInfo, characteristic: string) {
  // return true or false for logicals, otherwise leave it undefined
  if (info.sdKind === 'logical') {
    return info.sdCharacteristics?.some(c => c === characteristic) ?? false;
  }
}

function normalizeTypes(types: Type[]): Type[] {
  return types?.length ? types : FISHING_ORDER;
}
