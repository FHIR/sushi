import { FSHTank } from '../import/FSHTank';
import { Package } from './Package';
import { ProfileExporter } from './ProfileExporter';
import { ExtensionExporter } from './ExtensionExporter';
import { load } from '../fhirdefs';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter takes the Profiles and Extensions within the FSHDocuments of a FSHTank and returns them
 * as a structured Package.
 */
export class FHIRExporter {
  private readonly profileExporter: ProfileExporter;
  private readonly extensionExporter: ExtensionExporter;

  constructor() {
    const FHIRDefs = load('4.0.1');
    this.profileExporter = new ProfileExporter(FHIRDefs);
    this.extensionExporter = new ExtensionExporter(FHIRDefs);
  }

  export(tank: FSHTank): Package {
    const profileDefs = this.profileExporter.export(tank);
    const extensionDefs = this.extensionExporter.export(tank);
    return new Package(profileDefs, extensionDefs, tank.config);
  }
}
