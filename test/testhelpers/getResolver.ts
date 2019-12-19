import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ResolveFn } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';
import { loadFromPath } from '../../src/fhirdefs';
import path from 'path';
import os from 'os';
import fs from 'fs';

const defsCache = new FHIRDefinitions();

export function getResolver(defs: FHIRDefinitions): ResolveFn {
  return (type: string): StructureDefinition | undefined => {
    const json = defs.find(type);
    if (json) {
      return StructureDefinition.fromJSON(json);
    } else {
      const cachePath = path.join(
        os.homedir(),
        '.fhir',
        'packages',
        'hl7.fhir.r4.core#4.0.1',
        'package'
      );
      if (defsCache.size() === 0) loadFromPath(cachePath, 'temp', defsCache);
      if (defsCache.size() > 0) {
        const def = defsCache.find(type);
        if (def) {
          defs.add(def);
          fs.copyFileSync(
            path.join(cachePath, `${def.resourceType}-${def.id}.json`),
            path.join(
              __dirname,
              '..',
              'testhelpers',
              'testdefs',
              'package',
              `${def.resourceType}-${def.id}.json`
            )
          );
          return StructureDefinition.fromJSON(def);
        }
      }
    }
  };
}
