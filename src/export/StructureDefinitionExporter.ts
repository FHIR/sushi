import { FHIRDefinitions } from '../fhirdefs';
import { StructureDefinition, ElementDefinitionBindingStrength } from '../fhirtypes';
import { Profile, Extension } from '../fshtypes';
import { FSHTank } from '../import';
import { ParentNotDefinedError } from '../errors/ParentNotDefinedError';
import { CardRule, FixedValueRule, FlagRule, OnlyRule, ValueSetRule } from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import cloneDeep from 'lodash/cloneDeep';

/**
 * The StructureDefinitionExporter is a parent class for ProfileExporter and ExtensionExporter.
 * The operations and structure of both exporters are very similar, so any shared functionality
 * between the two should be included in this class.
 */
export class StructureDefinitionExporter {
  public readonly structDefs: StructureDefinition[] = [];

  constructor(public readonly FHIRDefs: FHIRDefinitions, public readonly tank: FSHTank) {}

  /**
   * Sets the metadata for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setMetadata(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    structDef.name = fshDefinition.name;
    structDef.id = fshDefinition.id;
    if (fshDefinition.title) structDef.title = fshDefinition.title;
    if (fshDefinition.description) structDef.description = fshDefinition.description;
    // Assuming the starting StructureDefinition was a clone of the parent,
    // set the baseDefinition to the parent url before re-assiging the url
    structDef.baseDefinition = structDef.url;
    // Now re-assign the URL based on canonical and id
    structDef.url = `${this.tank.config.canonical}/StructureDefinition/${structDef.id}`;
    // Set the derivation as appropriate
    if (fshDefinition instanceof Profile) {
      structDef.derivation = 'constraint';
    } else if (fshDefinition instanceof Extension) {
      structDef.derivation = 'constraint';
      if (structDef.context == null) {
        // NOTE: For now, we always set context to everything, but this will be user-specified
        // in the future
        structDef.context = [
          {
            type: 'element',
            expression: 'Element'
          }
        ];
      }
    }
  }

  /**
   * Sets the rules for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set rules on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setRules(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    for (const rule of fshDefinition.rules) {
      const element = structDef.findElementByPath(rule.path, this.resolve.bind(this));
      if (element) {
        try {
          if (rule instanceof CardRule) {
            element.constrainCardinality(rule.min, rule.max);
          } else if (rule instanceof FixedValueRule) {
            element.fixValue(rule.fixedValue);
          } else if (rule instanceof FlagRule) {
            element.applyFlags(rule.mustSupport, rule.summary, rule.modifier);
          } else if (rule instanceof OnlyRule) {
            const target = structDef.getReferenceName(rule.path, element);
            element.constrainType(rule.types, this.resolve.bind(this), target);
          } else if (rule instanceof ValueSetRule) {
            element.bindToVS(rule.valueSet, rule.strength as ElementDefinitionBindingStrength);
          }
        } catch (e) {
          logger.error(e.message);
        }
      } else {
        logger.error(
          `No element found at path ${rule.path} for ${fshDefinition.name}, skipping rule`
        );
      }
    }
  }

  /**
   * Looks through FHIR definitions to find the definition of the passed-in type
   * @param {string} type - The type to search for the FHIR definition of
   * @returns {StructureDefinition | undefined}
   */
  private resolve(type: string): StructureDefinition | undefined {
    const json = this.FHIRDefs.find(type);
    if (json) {
      return StructureDefinition.fromJSON(json);
      // Maybe it's a FSH-defined definition and not a FHIR one
    } else {
      let structDef = cloneDeep(this.structDefs.find(sd => sd.name === type));
      if (!structDef) {
        // If we find a parent, then we can export and resolve for its type again
        const parentDefinition =
          this.tank.findProfileByName(type) ?? this.tank.findExtensionByName(type);
        if (parentDefinition) {
          this.exportStructDef(parentDefinition);
          structDef = this.resolve(type);
        }
      }
      return structDef;
    }
  }

  /**
   * Exports Profile or Extension to StructureDefinition
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @returns {StructureDefinition}
   */
  exportStructDef(fshDefinition: Profile | Extension): void {
    const parentName = fshDefinition.parent || 'Resource';
    const structDef = this.resolve(parentName);

    // If we still don't have a resolution, then it's not defined
    if (!structDef) {
      throw new ParentNotDefinedError(fshDefinition.name, parentName);
    }

    // Capture the orginal elements so that any further changes are reflected in the differential
    structDef.captureOriginalElements();
    this.setMetadata(structDef, fshDefinition);
    this.setRules(structDef, fshDefinition);

    if (!this.structDefs.some(sd => sd.name === structDef.name)) {
      this.structDefs.push(structDef);
    }
  }
}
