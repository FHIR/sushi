import { FHIRExporter } from './FHIRExporter';
import { Package } from './Package';
import { FSHTank } from '../import';
import { FHIRDefinitions } from '../fhirdefs';

/**
 * Processes a set of FSH definitions into StructureDefinitions.
 * @param {FSHTank} tank - the tank containing the FSH definitions to process
 * @param {FHIRDefinitions} FHIRDefs - Any externally imported FHIRDefinitions
 * @returns {Package} - the Package structure returned from processing the FSH definitions
 */
export function exportFHIR(tank: FSHTank, FHIRDefs: FHIRDefinitions): Package {
  const exporter = new FHIRExporter(FHIRDefs);
  return exporter.export(tank);
}
