import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { loadFromPath } from 'fhir-package-loader';
import { Type, Metadata } from '../../src/utils/Fishable';
import { StructureDefinition } from '../../src/fhirtypes';
import { MasterFisher } from '../../src/utils';
import { FSHTank } from '../../src/import';
import { Package } from '../../src/export';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const defsCache = new FHIRDefinitions();

export class TestFisher extends MasterFisher {
  constructor(
    public tank?: FSHTank,
    public fhir?: FHIRDefinitions,
    public pkg?: Package,
    public cachePkgName = 'hl7.fhir.r4.core#4.0.1',
    public testPkgName = 'package'
  ) {
    super(tank, fhir, pkg);
  }

  withTank(tank: FSHTank) {
    this.tank = tank;
    return this;
  }

  withFHIR(fhir: FHIRDefinitions) {
    this.fhir = fhir;
    return this;
  }

  withPackage(pkg: Package) {
    this.pkg = pkg;
    return this;
  }

  withCachePackageName(pkgName: string) {
    this.cachePkgName = pkgName;
    return this;
  }

  withTestPackageName(pkgName: string) {
    this.testPkgName = pkgName;
    return this;
  }

  fishForStructureDefinition(
    item: string,
    ...types: (Type.Resource | Type.Type | Type.Profile | Type.Extension | Type.Logical)[]
  ) {
    const json = this.fishForFHIR(item, ...types);
    if (json) {
      return StructureDefinition.fromJSON(json);
    }
  }

  fishForFHIR(item: string, ...types: Type[]): any | undefined {
    let json = super.fishForFHIR(item, ...types);
    if (!json) {
      // try loading it from the cache and fishing again
      this.loadFromCache(item, ...types);
      json = super.fishForFHIR(item, ...types);
    }
    return json;
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata {
    let json = super.fishForMetadata(item, ...types);
    if (!json) {
      // try loading it from the cache and fishing again
      this.loadFromCache(item, ...types);
      json = super.fishForMetadata(item, ...types);
    }
    return json;
  }

  loadFromCache(item: string, ...types: Type[]): void {
    const cachePath = path.join(os.homedir(), '.fhir', 'packages', this.cachePkgName, 'package');
    // If there is no defsCache, load the FHIR defs from ~/.fhir
    if (defsCache.size() === 0) {
      loadFromPath(cachePath, 'temp', defsCache);
    }
    if (defsCache.size() > 0) {
      // If the cache has been loaded, and we use a resource from the cache,
      // make sure that resource is now copied into the test case package.
      const json = defsCache.fishForFHIR(item, ...types);
      if (json) {
        console.log(`!!! RESOURCE LOADED FROM LOCAL FHIR CACHE: ${item} !!!`);
        this.fhir.add(json);
        fs.copyFileSync(
          path.join(cachePath, `${json.resourceType}-${json.id}.json`),
          path.join(
            __dirname,
            '..',
            'testhelpers',
            'testdefs',
            this.testPkgName,
            `${json.resourceType}-${json.id}.json`
          )
        );
      }
    }
  }
}
