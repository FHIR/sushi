import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';

export class ProfileExporter extends StructureDefinitionExporter {
  constructor(FHIRDefs: FHIRDefinitions) {
    super(FHIRDefs);
  }

  /**
   * Exports Profiles to StructureDefinitions
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {StructureDefinition[]}
   */
  export(tank: FSHTank): StructureDefinition[] {
    for (const doc of tank.docs) {
      for (const profile of doc.profiles.values()) {
        try {
          const structDef = this.exportStructDef(profile, tank);
          this.structDefs.push(structDef);
        } catch (e) {
          logger.error(e.message);
        }
      }
    }
    return this.structDefs;
  }
}
