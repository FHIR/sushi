import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';

export class ExtensionExporter extends StructureDefinitionExporter {
  constructor(FHIRDefs: FHIRDefinitions) {
    super(FHIRDefs);
  }

  /**
   * Exports Extensions to StructureDefinitions
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {StructureDefinition[]}
   */
  export(tank: FSHTank): StructureDefinition[] {
    for (const doc of tank.docs) {
      for (const extension of doc.extensions.values()) {
        try {
          const structDef = this.exportStructDef(extension, tank);
        } catch (e) {
          logger.error(e.message);
        }
      }
    }
    return this.structDefs;
  }
}
