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
import { logger } from '../utils/FSHLogger';
import { ArtifactScopeKey } from '../ig';
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
    this.structureDefinitionExporter.applyInsertRules();
    this.codeSystemExporter.applyInsertRules();
    this.valueSetExporter.applyInsertRules();
    this.instanceExporter.applyInsertRules();
    this.mappingExporter.applyInsertRules();

    this.structureDefinitionExporter.export();
    this.codeSystemExporter.export();
    this.valueSetExporter.export();
    this.instanceExporter.export();
    this.structureDefinitionExporter.applyDeferredRules();
    this.mappingExporter.export();

    this.reportUnmatchedInclusionEntries();

    return this.pkg;
  }

  /**
   * Warns about inclusion-list entries that never matched an exported artifact, which usually means
   * the entry refers to an artifact that was renamed or removed.
   */
  private reportUnmatchedInclusionEntries(): void {
    const scopes = this.fisher.fhir?.getVersionScopes();
    if (!scopes?.isConfigured()) {
      return;
    }
    const exportedKeys: ArtifactScopeKey[] = [
      ...this.pkg.profiles,
      ...this.pkg.extensions,
      ...this.pkg.logicals,
      ...this.pkg.resources
    ].map(sd => ({ resourceType: 'StructureDefinition', id: sd.id, url: sd.url }));
    exportedKeys.push(
      ...this.pkg.valueSets.map(vs => ({ resourceType: 'ValueSet', id: vs.id, url: vs.url })),
      ...this.pkg.codeSystems.map(cs => ({ resourceType: 'CodeSystem', id: cs.id, url: cs.url })),
      ...this.pkg.instances.map(instance => ({
        resourceType: instance.resourceType,
        id: instance.id,
        url: instance.url
      }))
    );
    scopes.diagnosticsForExportedArtifacts(exportedKeys).forEach(({ version, value }) => {
      logger.warn(
        `The ${version}-inclusion parameter lists ${value}, but no exported artifact matches it. ` +
          'Update or remove the entry so version membership reflects the artifacts this IG produces.'
      );
    });
  }
}
