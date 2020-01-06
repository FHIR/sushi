import { FSHTank } from '../import/FSHTank';
import { Package } from './Package';
import { StructureDefinitionExporter } from './StructureDefinitionExporter';
import { FHIRDefinitions } from '../fhirdefs';
import { InstanceExporter } from './InstanceExporter';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter takes the Profiles and Extensions within the FSHDocuments of a FSHTank and returns them
 * as a structured Package.
 */
export class FHIRExporter {
  private readonly FHIRDefs: FHIRDefinitions;
  private structureDefinitionExporter: StructureDefinitionExporter;
  private instanceExporter: InstanceExporter;

  constructor(FHIRDefs: FHIRDefinitions) {
    this.FHIRDefs = FHIRDefs;
  }

  export(tank: FSHTank): Package {
    this.structureDefinitionExporter = new StructureDefinitionExporter(this.FHIRDefs, tank);
    this.instanceExporter = new InstanceExporter(
      this.FHIRDefs,
      tank,
      this.structureDefinitionExporter.resolve.bind(this.structureDefinitionExporter)
    );

    const { profileDefs, extensionDefs } = this.structureDefinitionExporter.export();
    const instanceDefs = this.instanceExporter.export();

    return new Package(profileDefs, extensionDefs, instanceDefs, tank.config);
  }
}
