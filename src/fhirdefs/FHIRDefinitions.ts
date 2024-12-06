import path from 'path';
import os from 'os';
import { flatten } from 'lodash';
import { Database } from 'sql.js';
import {
  BasePackageLoader,
  BasePackageLoaderOptions,
  BuildDotFhirDotOrgClient,
  CurrentBuildClient,
  DefaultRegistryClient,
  DiskBasedPackageCache,
  PackageCache,
  PackageDB,
  RegistryClient,
  ResourceInfo,
  SQLJSPackageDB,
  SafeMode,
  byLoadOrder,
  byType
} from 'fhir-package-loader';
import { PREDEFINED_PACKAGE_NAME } from '../ig';
import { Type, Metadata, Fishable, logger } from '../utils';
import {
  IMPLIED_EXTENSION_REGEX,
  materializeImpliedExtension,
  materializeImpliedExtensionMetadata
} from './impliedExtensions';
import initSqlJs from 'sql.js';

const FISHING_ORDER = [
  Type.Resource,
  Type.Logical,
  Type.Type,
  Type.Profile,
  Type.Extension,
  Type.ValueSet,
  Type.CodeSystem
];

const DEFAULT_SORT = [byType(...FISHING_ORDER), byLoadOrder(false)];

export class FHIRDefinitions extends BasePackageLoader implements Fishable {
  private fplLogInterceptor: (level: string, message: string) => boolean;
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
    let options: BasePackageLoaderOptions = {
      // Analysis of 500 projects shows most only need a cache of 100. Double it for the others.
      resourceCacheSize: 200,
      // Cloning every resource is slow, but we need some safety from unintentional modification.
      safeMode: SafeMode.FREEZE,
      // Use the same logger as SUSHI uses
      log: (level: string, message: string) => {
        // if there is an interceptor, invoke it and suppress the log if appropriate
        if (this.fplLogInterceptor) {
          const continueToLog = this.fplLogInterceptor(level, message);
          if (!continueToLog) {
            return;
          }
        }
        logger.log(level, message);
      }
    };
    if (override?.options) {
      options = Object.assign(options, override.options);
    }
    const packageDB = override?.packageDB ?? new SQLJSPackageDB(sqlDB);
    const fhirCache = path.join(os.homedir(), '.fhir', 'packages');
    const packageCache = override?.packageCache ?? new DiskBasedPackageCache(fhirCache, options);
    const registryClient = override?.registryClient ?? new DefaultRegistryClient(options);
    const buildClient = override?.currentBuildClient ?? new BuildDotFhirDotOrgClient(options);
    super(packageDB, packageCache, registryClient, buildClient, options);

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

  /**
   * An interceptor that can suppress FPL log messages based on level or message. This is
   * primarily used to suppress error logs when loading automatic dependencies.
   * @param interceptor an interceptor method that receives log information and returns true to
   *     continue logging or false to suppress that log statement
   */
  setFHIRPackageLoaderLogInterceptor(interceptor?: (level: string, message: string) => boolean) {
    this.fplLogInterceptor = interceptor;
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

  allPredefinedResources(): any[] {
    // Return in FIFO order to match previous SUSHI behavior
    const options = {
      scope: PREDEFINED_PACKAGE_NAME,
      sort: [byLoadOrder(true)]
    };
    return this.findResourceJSONs('*', options) ?? [];
  }

  fishForPredefinedResource(item: string, ...types: Type[]): any | undefined {
    return this.findResourceJSON(item, {
      type: types,
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.findResourceInfo(item, {
      type: types, // normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
    return convertInfoToMetadata(info);
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = this.findResourceJSON(item, {
      type: types,
      sort: DEFAULT_SORT
    });
    if (def) {
      return def;
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtension(item, this);
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.findResourceInfo(item, {
      type: types,
      sort: DEFAULT_SORT
    });
    if (info) {
      return convertInfoToMetadata(info);
    }
    // If it's an "implied extension", try to materialize it. See:http://hl7.org/fhir/versions.html#extensions
    if (IMPLIED_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      return materializeImpliedExtensionMetadata(item, this);
    }
  }
}

function convertInfoToMetadata(info: ResourceInfo): Metadata {
  if (info) {
    // Note: explicitly return undefined instead of null to keep tests happy
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

function logicalCharacteristic(info: ResourceInfo, characteristic: string) {
  // return true or false for logicals, otherwise leave it undefined
  if (info.sdKind === 'logical') {
    return info.sdCharacteristics?.some(c => c === characteristic) ?? false;
  }
}
