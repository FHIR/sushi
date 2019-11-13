import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ResolveFn } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

export function getResolver(defs: FHIRDefinitions): ResolveFn {
  return (type: string): StructureDefinition | undefined => {
    const json = defs.find(type);
    if (json) {
      return StructureDefinition.fromJSON(json);
    }
  };
}
