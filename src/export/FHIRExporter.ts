import { FSHTank } from '../import/FSHTank';
import { Package } from './Package';
import {
  CodeSystemExporter,
  InstanceExporter,
  StructureDefinitionExporter,
  ValueSetExporter,
  MappingExporter
} from '.';
import { MasterFisher } from '../utils';
/**
 * FHIRExporter handles the processing of FSH documents, storing the FSH types within them as FHIR types.
 * FHIRExporter takes the Profiles and Extensions within the FSHDocuments of a FSHTank and returns them
 * as a structured Package.
 */
export class FHIRExporter {
  private structureDefinitionExporter: StructureDefinitionExporter;
  private instanceExporter: InstanceExporter;
  private valueSetExporter: ValueSetExporter;
  private codeSystemExporter: CodeSystemExporter;
  private mappingExporter: MappingExporter;
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: MasterFisher
  ) {
    this.structureDefinitionExporter = new StructureDefinitionExporter(
      this.tank,
      this.pkg,
      this.fisher
    );
    this.valueSetExporter = new ValueSetExporter(this.tank, this.pkg, this.fisher);
    this.codeSystemExporter = new CodeSystemExporter(this.tank, this.pkg, this.fisher);
    this.instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
    this.mappingExporter = new MappingExporter(this.tank, this.pkg, this.fisher);
  }

  export(): Package {
    this.structureDefinitionExporter.export();
    this.codeSystemExporter.export();
    this.valueSetExporter.export();
    this.instanceExporter.export();
    this.structureDefinitionExporter.applyDeferredRules();
    this.mappingExporter.export();

    return this.pkg;
  }
}
