import { FSHTank } from '../import/FSHTank';
import { Package } from './Package';
import {
  CodeSystemExporter,
  InstanceExporter,
  StructureDefinitionExporter,
  ValueSetExporter
} from '.';
import { FHIRDefinitions } from '../fhirdefs';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter takes the Profiles and Extensions within the FSHDocuments of a FSHTank and returns them
 * as a structured Package.
 */
export class FHIRExporter {
  private readonly FHIRDefs: FHIRDefinitions;
  private structureDefinitionExporter: StructureDefinitionExporter;
  private instanceExporter: InstanceExporter;
  private valueSetExporter: ValueSetExporter;
  private codeSystemExporter: CodeSystemExporter;

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
    this.valueSetExporter = new ValueSetExporter(tank);
    this.codeSystemExporter = new CodeSystemExporter(tank);

    const { profileDefs, extensionDefs } = this.structureDefinitionExporter.export();
    const instanceDefs = this.instanceExporter.export();
    const valueSets = this.valueSetExporter.export();
    const codeSystems = this.codeSystemExporter.export();

    return new Package(
      profileDefs,
      extensionDefs,
      instanceDefs,
      valueSets,
      codeSystems,
      tank.config
    );
  }
}
