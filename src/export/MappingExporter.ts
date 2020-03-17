import { FSHTank } from '../import';
import { Package } from '.';
import { logger, Type, MasterFisher } from '../utils';
import { Mapping } from '../fshtypes';
import { StructureDefinition, idRegex } from '../fhirtypes';
import { InvalidFHIRIdError } from '../errors';

export class MappingExporter {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: MasterFisher
  ) {}

  /**
   * Sets the mapping on the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set the mapping on
   * @param {Mapping} fshDefinition - The Mapping definition
   * @throws {InvalidFHIRIdError} when the id on the fshDefinition is not valid in FHIR
   */
  private setMetadata(structDef: StructureDefinition, fshDefinition: Mapping): void {
    if (structDef.mapping == null) {
      structDef.mapping = [];
    }
    if (!idRegex.test(fshDefinition.id)) {
      throw new InvalidFHIRIdError(fshDefinition.id);
    }
    structDef.mapping.push({
      identity: fshDefinition.id,
      name: fshDefinition.name,
      ...(fshDefinition.target && { uri: fshDefinition.target }),
      ...(fshDefinition.description && { comment: fshDefinition.description })
    });
  }

  /**
   * Applies mapping rules to the individual ElementDefinitions on the SD
   * @param {StructureDefinition} structDef - The StructureDefinition to apply rules on
   * @param {Mapping} fshDefinition - The Mapping definition
   */
  private setMappingRules(structDef: StructureDefinition, fshDefinition: Mapping): void {
    for (const rule of fshDefinition.rules) {
      const element = structDef.findElementByPath(rule.path, this.fisher);
      if (element) {
        try {
          element.applyMapping(fshDefinition.id, rule.map, rule.comment, rule.language);
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
        }
      } else {
        logger.error(
          `No element found at path ${rule.path} for ${fshDefinition.name}, skipping rule`,
          rule.sourceInfo
        );
      }
    }
  }

  /**
   * Exports a Mapping by finding the Source StructureDefinition and applying rules
   * @param {Mapping} fshDefinition - The Mapping definition to apply
   */
  exportMapping(fshDefinition: Mapping): void {
    const sourceStructDef = this.pkg.fish(
      fshDefinition.source,
      Type.Profile,
      Type.Extension
    ) as StructureDefinition;
    if (sourceStructDef) {
      this.setMetadata(sourceStructDef, fshDefinition);
      this.setMappingRules(sourceStructDef, fshDefinition);
    } else {
      logger.error(`Unable to find source "${fshDefinition.source}".`, fshDefinition.sourceInfo);
    }
  }

  export(): void {
    const mappings = this.tank.getAllMappings();
    for (const mapping of mappings) {
      try {
        this.exportMapping(mapping);
      } catch (e) {
        logger.error(e.message, mapping.sourceInfo);
      }
    }
  }
}
