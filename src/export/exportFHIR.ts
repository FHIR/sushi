import { FHIRExporter } from './FHIRExporter';
import { StructureDefinition } from '../fhirtypes';
import { FSHTank } from '../import';

/**
 * Processes a set of FSH definitions into StructureDefinitions.
 * @param {FSHTank} tank - the tank containing the FSJ definitions to process
 * @returns {StructureDefinition[]} - the set of StructureDefinitions processed from the tank
 */
export function exportFHIR(tank: FSHTank): StructureDefinition[] {
  const exporter = new FHIRExporter();
  return exporter.export(tank);
}
