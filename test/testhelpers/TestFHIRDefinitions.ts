import path from 'path';
import fs from 'fs-extra';
import { mock, MockProxy } from 'jest-mock-extended';
import initSqlJs, { Database } from 'sql.js';
import {
  CurrentBuildClient,
  DiskBasedVirtualPackage,
  InMemoryVirtualPackage,
  PackageCache,
  RegistryClient
} from 'fhir-package-loader';
import { FHIRDefinitions, R5_DEFINITIONS_NEEDED_IN_R4 } from '../../src/fhirdefs';
import { logMessage } from '../../src/utils';
import { Readable } from 'stream';
import { PREDEFINED_PACKAGE_NAME, PREDEFINED_PACKAGE_VERSION } from '../../src//ig';

let VP_COUNTER = 0;

const VIRTUAL_PACKAGE_OPTIONS = {
  recursive: true,
  allowNonResources: true,
  log: logMessage
};

export class TestFHIRDefinitions extends FHIRDefinitions {
  packageCacheMock: MockProxy<PackageCache>;
  registryClientMock: MockProxy<RegistryClient>;
  currentBuildClientMock: MockProxy<CurrentBuildClient>;
  supplementalFHIRDefinitionsFactoryMock: jest.Mock;
  private cachedPackages: string[] = [];

  constructor(sqlDB: Database, isSupplementalFHIRDefinitions = false) {
    // Mock out stuff so we don't make network calls or corrupt our FHIR cache
    const packageCacheMock = mock<PackageCache>();
    const registryClientMock = mock<RegistryClient>();
    const currentBuildClientMock = mock<CurrentBuildClient>();
    const supplementalFHIRDefinitionsFactoryMock = jest.fn();
    super(sqlDB, isSupplementalFHIRDefinitions, supplementalFHIRDefinitionsFactoryMock, {
      packageCache: packageCacheMock,
      registryClient: registryClientMock,
      currentBuildClient: currentBuildClientMock
    });

    // build out the PackageCache mock
    packageCacheMock.cachePackageTarball.mockImplementation((name: string, version: string) => {
      this.cachedPackages.push(`${name}#${version}`);
      return Promise.resolve(`/mock/path/to/${name}#${version}`);
    });
    packageCacheMock.isPackageInCache.mockImplementation((name: string, version: string) =>
      this.cachedPackages.includes(`${name}#${version}`)
    );
    packageCacheMock.getPackagePath.mockImplementation((name: string, version: string) => {
      return `/mock/path/to/${name}#${version}`;
    });
    packageCacheMock.getPackageJSONPath.mockImplementation((name: string, version: string) => {
      return `/mock/path/to/${name}#${version}/package/package.json`;
    });
    packageCacheMock.getPotentialResourcePaths.mockImplementation(
      (/*name: string, version: string*/) => {
        return [];
      }
    );
    packageCacheMock.getResourceAtPath.mockImplementation((resourcePath: string) => {
      const match = resourcePath.match(/\/mock\/path\/to\/([^#]+)#([^/]+)\/package\/package.json/);
      if (match) {
        return { name: match[1], version: match[2] };
      }
    });
    this.packageCacheMock = packageCacheMock;

    // build out the RegistryClient mock
    registryClientMock.download.mockResolvedValue(Readable.from(['mock-data']));
    registryClientMock.resolveVersion.mockImplementation((name: string, version: string) => {
      if (version === 'latest') {
        return Promise.resolve('9.9.9');
      } else if (version.endsWith('.x')) {
        return Promise.resolve(version.replace('.x', '.9'));
      }
      return Promise.resolve(version);
    });
    this.registryClientMock = registryClientMock;

    // build out the CurrentBuild mock
    currentBuildClientMock.downloadCurrentBuild.mockResolvedValue(Readable.from(['mock-data']));
    currentBuildClientMock.getCurrentBuildDate.mockResolvedValue('20240824230227');
    this.currentBuildClientMock = currentBuildClientMock;

    // build out the supplementatlFHIRDefinitionsFactoryMock
    supplementalFHIRDefinitionsFactoryMock.mockImplementation(async () => {
      const SQL = await initSqlJs();
      return new TestFHIRDefinitions(new SQL.Database(), true);
    });
    this.supplementalFHIRDefinitionsFactoryMock = supplementalFHIRDefinitionsFactoryMock;
  }

  async loadLocalPaths(...localPaths: string[]) {
    const virtualPackages = getLocalVirtualPackages(...localPaths);
    for (const vp of virtualPackages) {
      await this.loadVirtualPackage(vp);
    }
  }

  async loadCustomResources(...paths: string[]) {
    await this.loadVirtualPackage(
      new DiskBasedVirtualPackage(
        { name: PREDEFINED_PACKAGE_NAME, version: PREDEFINED_PACKAGE_VERSION },
        paths,
        {
          log: logMessage,
          allowNonResources: true, // support for logical instances
          recursive: true
        }
      )
    );
  }
}

export async function getTestFHIRDefinitions(
  includeR5forR4 = false,
  ...localPaths: string[]
): Promise<TestFHIRDefinitions> {
  const SQL = await initSqlJs();
  const defs = new TestFHIRDefinitions(new SQL.Database());

  if (includeR5forR4) {
    // This mirrors what happens in Processing.ts for R4 and R4B
    const R5forR4Map = new Map<string, any>();
    R5_DEFINITIONS_NEEDED_IN_R4.forEach(def => R5forR4Map.set(def.id, def));
    const virtualR5forR4Package = new InMemoryVirtualPackage(
      { name: 'sushi-r5forR4', version: '1.0.0' },
      R5forR4Map,
      VIRTUAL_PACKAGE_OPTIONS
    );
    await defs.loadVirtualPackage(virtualR5forR4Package);
  }

  // Then load the specifically requested resource paths
  if (localPaths.length > 0) {
    defs.loadLocalPaths(...localPaths);
  }
  return defs;
}

export function getLocalVirtualPackage(localPath: string): DiskBasedVirtualPackage {
  let packageJSON: { name: string; version: string };
  if (fs.existsSync(path.join(localPath, 'package.json'))) {
    packageJSON = fs.readJSONSync(path.join(localPath, 'package.json'));
  } else if (fs.existsSync(path.join(localPath, 'package', 'package.json'))) {
    packageJSON = fs.readJSONSync(path.join(localPath, 'package', 'package.json'));
  } else {
    packageJSON = { name: `sushi-test-${++VP_COUNTER}`, version: '0.0.1' };
  }
  return new DiskBasedVirtualPackage(packageJSON, [localPath], VIRTUAL_PACKAGE_OPTIONS);
}

export function getLocalVirtualPackages(...localPaths: string[]): DiskBasedVirtualPackage[] {
  const virtualPackages: DiskBasedVirtualPackage[] = [];
  const leftoverPaths: string[] = [];
  localPaths.forEach(p => {
    if (
      fs.existsSync(path.join(p, 'package.json')) ||
      fs.existsSync(path.join(p, 'package', 'package.json'))
    ) {
      virtualPackages.push(getLocalVirtualPackage(p));
    } else {
      leftoverPaths.push(p);
    }
  });
  if (leftoverPaths.length) {
    const packageJSON = { name: `sushi-test-${++VP_COUNTER}`, version: '0.0.1' };
    virtualPackages.push(
      new DiskBasedVirtualPackage(packageJSON, localPaths, VIRTUAL_PACKAGE_OPTIONS)
    );
  }
  return virtualPackages;
}

export function testDefsPath(...subpathPart: string[]) {
  return path.join(__dirname, 'testdefs', ...subpathPart);
}
