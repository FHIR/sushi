import { FSHTank } from '../import';
import { Package } from '.';
import { logger, Type, MasterFisher } from '../utils';
import { Mapping } from '../fshtypes';
import { StructureDefinition, idRegex } from '../fhirtypes';
import { InvalidFHIRIdError } from '../errors';
import { MappingRule } from '../fshtypes/rules';
import { applyInsertRules } from '../fhirtypes/common';
import { groupBy, pickBy } from 'lodash';

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
      ...(fshDefinition.title && { name: fshDefinition.title }),
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
    // Before applying mapping rules, applyInsertRules will expand any insert rules into mapping rules
    applyInsertRules(fshDefinition, this.tank);
    for (const rule of fshDefinition.rules as MappingRule[]) {
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
    // The mappings on each Structure Definition should have a unique id
    const groupedMappings = groupBy(mappings, 'source');
    for (const sd in groupedMappings) {
      const duplicateMappings = pickBy(groupBy(groupedMappings[sd], 'id'), m => m.length > 1);
      for (const duplicateId in duplicateMappings) {
        // show error for each time the id was used after the first
        duplicateMappings[duplicateId].slice(1).forEach(m => {
          logger.error(`Multiple mappings on ${sd} found with id ${m.id}`, m.sourceInfo);
        });
      }
    }
  }
}
