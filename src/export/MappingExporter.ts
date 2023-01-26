import { FSHTank } from '../import';
import { Package } from '.';
import { logger, Type, MasterFisher, resolveSoftIndexing } from '../utils';
import { Mapping } from '../fshtypes';
import { StructureDefinition, StructureDefinitionMapping, idRegex } from '../fhirtypes';
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
    resolveSoftIndexing(fshDefinition.rules);
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

  applyInsertRules(): void {
    const mappings = this.tank.getAllMappings();
    for (const mapping of mappings) {
      applyInsertRules(mapping, this.tank);
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
      Type.Extension,
      Type.Resource,
      Type.Logical
    ) as StructureDefinition;
    if (sourceStructDef) {
      const parent = this.fisher.fishForFHIR(
        sourceStructDef.baseDefinition,
        Type.Resource,
        Type.Type,
        Type.Profile,
        Type.Extension,
        Type.Logical
      );
      const matchingParentMapping = parent?.mapping.find(
        (m: StructureDefinitionMapping) => m.identity === fshDefinition.id
      );
      if (matchingParentMapping != null) {
        const isMatchingTitle = fshDefinition.title
          ? fshDefinition.title === matchingParentMapping.name
          : true;
        const isMatchingTarget = fshDefinition.target
          ? fshDefinition.target === matchingParentMapping.uri
          : true;
        if (!isMatchingTitle || !isMatchingTarget) {
          // If the mapping identity matches one on the parent, all other metadata must also match in order to merge MappingRules
          logger.error(
            `Unable to add Mapping ${fshDefinition.name} because it conflicts with one already on the parent of ${fshDefinition.source}.`,
            fshDefinition.sourceInfo
          );
          return;
        } else {
          // Update parent mapping with additional or changed metadata (comment is the only property this can be the case for)
          const inheritedMapping = sourceStructDef.mapping.find(
            m => m.identity === fshDefinition.id
          );
          if (fshDefinition.description) {
            inheritedMapping.comment = fshDefinition.description;
          }
        }
      } else {
        // Only add metadata if it does not already exist on the parent
        this.setMetadata(sourceStructDef, fshDefinition);
      }
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
