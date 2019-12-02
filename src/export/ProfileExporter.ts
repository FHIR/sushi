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
    for (const profile of this.tank.getAllProfiles()) {
      try {
        this.exportStructDef(profile);
      } catch (e) {
        logger.error(e.message, e.sourceInfo);
      }
    }
    return this.structDefs;
  }
}
