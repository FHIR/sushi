import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { ElementDefinitionType, ResolveFn } from '../../src/fhirtypes/ElementDefinition';
import { StructureDefinition } from '../../src/fhirtypes/StructureDefinition';

export function getResolver(defs: FHIRDefinitions): ResolveFn {
  return (type: ElementDefinitionType): StructureDefinition | undefined => {
    const json = defs.find(type.code);
    if (json) {
      return StructureDefinition.fromJSON(json);
    }
  };
}
