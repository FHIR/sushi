import path from 'path';
import os from 'os';
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
import { Type, Metadata, Fishable, logger, getFHIRVersionInfo } from '../utils';

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

const XVER_EXTENSION_REGEX =
  /^http:\/\/hl7\.org\/fhir\/(\d+\.\d+)\/StructureDefinition\/extension-[^./]+\..+$/;

export class FHIRDefinitions extends BasePackageLoader implements Fishable {
  private fplLogInterceptor: (level: string, message: string) => boolean;
  private fplPackageDB: PackageDB;

  constructor(
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
    const packageDB = override?.packageDB ?? new SQLJSPackageDB();
    const fhirCache = path.join(os.homedir(), '.fhir', 'packages');
    const packageCache = override?.packageCache ?? new DiskBasedPackageCache(fhirCache, options);
    const registryClient = override?.registryClient ?? new DefaultRegistryClient(options);
    const buildClient = override?.currentBuildClient ?? new BuildDotFhirDotOrgClient(options);
    super(packageDB, packageCache, registryClient, buildClient, options);
    this.fplPackageDB = packageDB;
  }

  async initialize() {
    if (this.fplPackageDB instanceof SQLJSPackageDB) {
      await this.fplPackageDB.initialize();
    }
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
      type: normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
  }

  fishForPredefinedResourceMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.findResourceInfo(item, {
      type: normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
    return convertInfoToMetadata(info);
  }

  fishForPredefinedResourceMetadatas(item: string, ...types: Type[]): Metadata[] {
    const infos = this.findResourceInfos(item, {
      type: normalizeTypes(types),
      scope: PREDEFINED_PACKAGE_NAME,
      sort: DEFAULT_SORT
    });
    return infos.map(info => convertInfoToMetadata(info));
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    const def = this.findResourceJSON(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
    if (def) {
      return def;
    }
    // If it's a cross-version extension, attempt to fix it and/or provide guidance re: xver packages
    if (XVER_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      const newURL = fixXverURL(item);
      if (newURL != item) {
        // We corrected the URL, so try fishing again
        return this.fishForFHIR(newURL, Type.Extension);
      }
      this.logXverExtensionDependencyError(item);
    }
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata | undefined {
    const info = this.findResourceInfo(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
    if (info) {
      return convertInfoToMetadata(info);
    }
    // If it's a cross-version extension, attempt to fix it and/or provide guidance re: xver packages
    if (XVER_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      const newURL = fixXverURL(item);
      if (newURL != item) {
        // We corrected the URL, so try fishing again
        return this.fishForMetadata(newURL, Type.Extension);
      }
      this.logXverExtensionDependencyError(item);
    }
  }

  fishForMetadatas(item: string, ...types: Type[]): Metadata[] {
    const infos = this.findResourceInfos(item, {
      type: normalizeTypes(types),
      sort: DEFAULT_SORT
    });
    if (infos.length) {
      return infos.map(info => convertInfoToMetadata(info));
    }
    // If it's a cross-version extension, attempt to fix it and/or provide guidance re: xver packages
    if (XVER_EXTENSION_REGEX.test(item) && types.some(t => t === Type.Extension)) {
      const newURL = fixXverURL(item);
      if (newURL != item) {
        // We corrected the URL, so try fishing again
        return this.fishForMetadatas(newURL, Type.Extension);
      }
      this.logXverExtensionDependencyError(item);
    }
    return [];
  }

  private logXverExtensionDependencyError(url: string) {
    const match = decodeURI(url).match(XVER_EXTENSION_REGEX);
    const [, version] = match;
    const source = xverVersionToReleaseTag(version);
    const fhirVersion = this.fishForFHIR('StructureDefinition', Type.Resource)?.fhirVersion;
    const target = getFHIRVersionInfo(fhirVersion)?.name?.replace(/D?STU/, 'r').toLowerCase();
    const xverPackage = `hl7.fhir.uv.xver-${source}.${target}`;
    const xverPackageInfos = this.findPackageInfos(xverPackage);
    if (xverPackageInfos.length) {
      logger.error(
        `The extension ${url} was not found in the extension package ${xverPackage}. ` +
          'Please check the xver package documentation to ensure you are using the correct URL.\n' +
          `  See: https://hl7.org/fhir/uv/xver-${source}.${target}/${xverPackageInfos[0].version}/`
      );
    } else {
      logger.error(
        `The extension ${url} requires the cross-version extension package ${xverPackage} ` +
          'to be declared in your sushi-config.yaml file.\n' +
          '  See: https://confluence.hl7.org/spaces/FHIRI/pages/413256623/FAQs'
      );
    }
  }
}

export async function createFHIRDefinitions(
  // override is mainly intended to be used in unit tests
  override?: {
    packageDB?: PackageDB;
    packageCache?: PackageCache;
    registryClient?: RegistryClient;
    currentBuildClient?: CurrentBuildClient;
    options?: BasePackageLoaderOptions;
  }
) {
  const fhirDefinitions = new FHIRDefinitions(override);
  await fhirDefinitions.initialize();
  return fhirDefinitions;
}

function normalizeTypes(types?: Type[]): undefined | string[] {
  // Instance is like a wildcard, allowing anything -- so treat it like no types are passed in at all
  return types?.some(t => t === Type.Instance) ? undefined : types;
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

function fixXverURL(url: string) {
  const match = url.match(/^(.+)(\[x\]|%5Bx%5D)$/);
  if (match) {
    const newURL = match[1];
    logger.warn(
      'Cross-version extensions for choice elements should omit the [x] suffix.\n' +
        `  Found URL:     ${url}\n` +
        `  Corrected URL: ${newURL}\n` +
        '  SUSHI will use the corrected URL, but authors should fix the URL in their FSH source.'
    );
    return newURL;
  }
  return url;
}

function xverVersionToReleaseTag(xverVersion: string): string {
  switch (xverVersion) {
    case '1.0':
      return 'r2';
    case '4.3':
      return 'r4b';
    default:
      return `r${xverVersion.match(/^(\d+)/)![1]}`;
  }
}
