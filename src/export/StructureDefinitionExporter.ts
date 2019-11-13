import { FHIRDefinitions } from '../fhirdefs';
import { StructureDefinition } from '../fhirtypes';
import { Profile, Extension } from '../fshtypes';
import { FSHTank } from '../import';
import { ParentNotDefinedError } from '../errors/ParentNotDefinedError';
import { CardRule } from '../fshtypes/rules';

/**
 * The StructureDefinitionExporter is a parent class for ProfileExporter and ExtensionExporter.
 * The operations and structure of both exporters are very similar, so any shared functionality
 * between the two should be included in this class.
 */
export class StructureDefinitionExporter {
  constructor(public readonly FHIRDefs: FHIRDefinitions) {}

  /**
   * Sets the metadata for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @param {FSHTank} tank - The FSH tank we are exporting
   */
  private setMetadata(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension,
    tank: FSHTank
  ): void {
    structDef.name = fshDefinition.name;
    structDef.id = fshDefinition.id;
    structDef.url = `${tank.packageJSON.canonical}/StructureDefinition/${structDef.id}`;
    if (fshDefinition.title) structDef.title = fshDefinition.title;
    if (fshDefinition.description) structDef.description = fshDefinition.description;
  }

  /**
   * Sets the rules for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set rules on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setRules(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    for (const rule of fshDefinition.rules) {
      const element = structDef.findElementByPath(rule.path, (type: string):
        | StructureDefinition
        | undefined => {
        const json = this.FHIRDefs.find(type);
        if (json) {
          return StructureDefinition.fromJSON(json);
        }
      });
      if (element) {
        try {
          if (rule instanceof CardRule) {
            element.constrainCardinality(rule.min, rule.max);
          }
        } catch (e) {
          console.error(e.stack);
        }
      } else {
        console.error(
          `No element found at path ${rule.path} for ${fshDefinition.name}, skipping rule`
        );
      }
    }
  }

  /**
   * Exports Profile or Extension to StructureDefinition
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {StructureDefinition}
   */
  exportStructDef(fshDefinition: Profile | Extension, tank: FSHTank): StructureDefinition {
    const parentName = fshDefinition.parent || 'Resource';
    const jsonParent = this.FHIRDefs.find(parentName);
    let structDef: StructureDefinition;
    if (jsonParent) {
      structDef = StructureDefinition.fromJSON(jsonParent);
    } else {
      throw new ParentNotDefinedError(fshDefinition.name, parentName);
    }
    // Capture the orginal elements so that any further changes are reflected in the differential
    structDef.captureOriginalElements();
    this.setMetadata(structDef, fshDefinition, tank);
    this.setRules(structDef, fshDefinition);
    // Set the rules
    return structDef;
  }
}
