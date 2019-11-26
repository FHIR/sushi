import { FSHTank } from '../import/FSHTank';
import { Package } from './Package';
import { ProfileExporter } from './ProfileExporter';
import { ExtensionExporter } from './ExtensionExporter';
import { load, FHIRDefinitions } from '../fhirdefs';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter takes the Profiles and Extensions within the FSHDocuments of a FSHTank and returns them
 * as a structured Package.
 */
export class FHIRExporter {
  private readonly FHIRDefs: FHIRDefinitions;
  private profileExporter: ProfileExporter;
  private extensionExporter: ExtensionExporter;

  constructor() {
    this.FHIRDefs = load('4.0.1');
  }

  export(tank: FSHTank): Package {
    this.profileExporter = new ProfileExporter(this.FHIRDefs, tank);
    this.extensionExporter = new ExtensionExporter(this.FHIRDefs, tank);
    const profileDefs = this.profileExporter.export();
    const extensionDefs = this.extensionExporter.export();
    return new Package(profileDefs, extensionDefs, tank.config);
  }
}
