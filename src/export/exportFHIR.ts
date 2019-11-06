import { FHIRExporter } from './FHIRExporter';
import { Package } from './Package';
import { FSHTank } from '../import';

/**
 * Processes a set of FSH definitions into StructureDefinitions.
 * @param {FSHTank} tank - the tank containing the FSH definitions to process
 * @returns {Package} - the Package structure returned from processing the FSH definitions
 */
export function exportFHIR(tank: FSHTank): Package {
  const exporter = new FHIRExporter();
  return exporter.export(tank);
}
