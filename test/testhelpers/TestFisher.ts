import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { loadFromPath } from '../../src/fhirdefs';
import { Type, Fishable, Metadata } from '../../src/utils/Fishable';
import { StructureDefinition } from '../../src/fhirtypes';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const defsCache = new FHIRDefinitions();

export class TestFisher implements Fishable {
  constructor(private fhirDefs: FHIRDefinitions) {}

  fishForStructureDefinition(
    item: string,
    ...types: (Type.Resource | Type.Type | Type.Profile | Type.Extension)[]
  ) {
    const json = this.fishForFHIR(item, ...types);
    if (json) {
      return StructureDefinition.fromJSON(json);
    }
  }

  fishForFHIR(item: string, ...types: Type[]) {
    let json = this.fhirDefs.fishForFHIR(item, ...types);
    if (!json) {
      // try loading it from the cache and fishing again
      this.loadFromCache(item, ...types);
      json = this.fhirDefs.fishForFHIR(item, ...types);
    }
    return json;
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata {
    let json = this.fhirDefs.fishForMetadata(item, ...types);
    if (!json) {
      // try loading it from the cache and fishing again
      this.loadFromCache(item, ...types);
      json = this.fhirDefs.fishForMetadata(item, ...types);
    }
    return json;
  }

  loadFromCache(item: string, ...types: Type[]): void {
    const cachePath = path.join(
      os.homedir(),
      '.fhir',
      'packages',
      'hl7.fhir.r4.core#4.0.1',
      'package'
    );
    // If there is no defsCache, load the FHIR defs from ~/.fhir
    if (defsCache.size() === 0) {
      loadFromPath(cachePath, 'temp', defsCache);
    }
    if (defsCache.size() > 0) {
      // If the cache has been loaded, and we use a resource from the cache,
      // make sure that resource is now copied into the test case package.
      const json = defsCache.fishForFHIR(item, ...types);
      if (json) {
        this.fhirDefs.add(json);
        fs.copyFileSync(
          path.join(cachePath, `${json.resourceType}-${json.id}.json`),
          path.join(
            __dirname,
            '..',
            'testhelpers',
            'testdefs',
            'package',
            `${json.resourceType}-${json.id}.json`
          )
        );
      }
    }
  }
}
