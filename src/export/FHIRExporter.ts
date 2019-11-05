import { FSHTank } from '../import/FSHTank';
import { StructureDefinition } from '../fhirtypes';
import { ProfileExporter, ExtensionExporter } from '.';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter references several takes the Profiles and Extensions within the FSHDocuments of a FSHTank
 * and returns them as StructureDefinitions.
 */
export class FHIRExporter {
  private readonly profileExporter: ProfileExporter;
  private readonly extensionExporter: ExtensionExporter;

  constructor() {
    this.profileExporter = new ProfileExporter();
    this.extensionExporter = new ExtensionExporter();
  }

  export(tank: FSHTank): StructureDefinition[] {
    const profileDefs = this.profileExporter.export(tank);
    const extensionDefs = this.extensionExporter.export(tank);
    return [...profileDefs, ...extensionDefs];
  }
}
