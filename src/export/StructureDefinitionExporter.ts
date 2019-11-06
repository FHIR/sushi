import { FHIRDefinitions } from '../fhirdefs';
import { StructureDefinition } from '../fhirtypes';
import { Profile, Extension } from '../fshtypes';
import { FSHTank } from '../import';
import { ParentNotDefinedError } from '../errors/ParentNotDefinedError';

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
  setMetadata(structDef: StructureDefinition, fshDefinition: Profile | Extension, tank: FSHTank) {
    structDef.name = fshDefinition.name;
    structDef.id = fshDefinition.id;
    structDef.url = `${tank.packageJSON.canonical}/StructureDefinition/${structDef.id}`;
    if (fshDefinition.title) structDef.title = fshDefinition.title;
    if (fshDefinition.description) structDef.description = fshDefinition.description;
  }

  /**
   * Exports Profile or Extension to StructureDefinition
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {StructureDefinition}
   */
  exportStructDef(fshDefinition: Profile | Extension, tank: FSHTank): StructureDefinition {
    const parentName = fshDefinition.parent ? fshDefinition.parent : 'Resource';
    const jsonParent =
      fshDefinition instanceof Profile
        ? this.FHIRDefs.findResource(parentName)
        : this.FHIRDefs.findType(parentName);
    let structDef: StructureDefinition;
    if (jsonParent) {
      structDef = StructureDefinition.fromJSON(jsonParent);
    } else {
      throw new ParentNotDefinedError(fshDefinition.name, parentName);
    }
    this.setMetadata(structDef, fshDefinition, tank);
    // Set the rules
    return structDef;
  }
}
