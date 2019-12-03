import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';

export class ExtensionExporter extends StructureDefinitionExporter {
  constructor(FHIRDefs: FHIRDefinitions, tank: FSHTank) {
    super(FHIRDefs, tank);
  }

  /**
   * Exports Extensions to StructureDefinitions
   * @returns {StructureDefinition[]}
   */
  export(): StructureDefinition[] {
    for (const extension of this.tank.getAllExtensions()) {
      try {
        this.exportStructDef(extension);
      } catch (e) {
        logger.error(e.message, e.sourceInfo);
      }
    }
    return this.structDefs;
  }
}
