import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';

export class ProfileExporter extends StructureDefinitionExporter {
  constructor(FHIRDefs: FHIRDefinitions, tank: FSHTank) {
    super(FHIRDefs, tank);
  }

  /**
   * Exports Profiles to StructureDefinitions
   * @returns {StructureDefinition[]}
   */
  export(): StructureDefinition[] {
    for (const doc of this.tank.docs) {
      for (const profile of doc.profiles.values()) {
        try {
          this.exportStructDef(profile);
        } catch (e) {
          logger.error(e.message);
        }
      }
    }
    return this.structDefs;
  }
}
