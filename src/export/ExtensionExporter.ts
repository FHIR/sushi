import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';

export class ExtensionExporter extends StructureDefinitionExporter {
  constructor() {
    super();
  }

  export(tank: FSHTank): StructureDefinition[] {
    // TODO: Make meaningful export of StructureDefinitions from contents of tank
    return [];
  }
}
