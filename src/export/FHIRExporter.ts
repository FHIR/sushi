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
    // TODO: There is currently a bug in how we do exports that causes some duplicates in the
    // Package.  More specifically, if a FSH Extension is resolved while exporting a Profile,
    // then the resolved Extension will be put in the Profiles array.  The reverse is also
    // true.  We need to determine how best to fix that bug, but in the meantime, we will
    // just remove the duplicates here so the downstream processes don't have to deal with it.
    const deduplicatedProfileDefs = profileDefs.filter(sd => tank.findProfile(sd.name));
    const deduplicatedExtensionDefs = extensionDefs.filter(sd => tank.findExtension(sd.name));
    return new Package(deduplicatedProfileDefs, deduplicatedExtensionDefs, tank.config);
  }
}
