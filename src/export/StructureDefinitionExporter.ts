import { FHIRDefinitions } from '../fhirdefs';
import { StructureDefinition, ElementDefinitionBindingStrength } from '../fhirtypes';
import { Profile, Extension } from '../fshtypes';
import { FSHTank } from '../import';
import { ParentNotDefinedError, InvalidExtensionSliceError } from '../errors';
import {
  CardRule,
  FixedValueRule,
  FlagRule,
  OnlyRule,
  ValueSetRule,
  ContainsRule,
  CaretValueRule
} from '../fshtypes/rules';
import { logger } from '../utils/FSHLogger';
import cloneDeep from 'lodash/cloneDeep';
import { replaceReferences } from '../fhirtypes/common';

/**
 * The StructureDefinitionExporter is the class for exporting Profiles and Extensions.
 * The operations and structure of both exporters are very similar, so they currently share an exporter.
 */
export class StructureDefinitionExporter {
  public readonly profileDefs: StructureDefinition[] = [];
  public readonly extensionDefs: StructureDefinition[] = [];

  constructor(public readonly FHIRDefs: FHIRDefinitions, public readonly tank: FSHTank) {}

  private get structDefs(): StructureDefinition[] {
    return [...this.profileDefs, ...this.extensionDefs];
  }

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
            replaceReferences(rule, this.tank, this.resolve);
            element.fixValue(rule.fixedValue);
          } else if (rule instanceof FlagRule) {
            element.applyFlags(rule.mustSupport, rule.summary, rule.modifier);
          } else if (rule instanceof OnlyRule) {
            const target = structDef.getReferenceName(rule.path, element);
            element.constrainType(rule.types, this.resolve.bind(this), target);
          } else if (rule instanceof ValueSetRule) {
            element.bindToVS(rule.valueSet, rule.strength as ElementDefinitionBindingStrength);
          } else if (rule instanceof ContainsRule) {
            const isExtension = element.type?.length === 1 && element.type[0].code === 'Extension';
            if (isExtension && !element.slicing) {
              element.sliceIt('value', 'url');
            }
            rule.items.forEach(item => {
              const slice = element.addSlice(item);
              if (isExtension) {
                const extension = this.resolve(item);
                if (extension) {
                  if (!slice.type[0].profile) {
                    slice.type[0].profile = [];
                  }
                  slice.type[0].profile.push(extension.url);
                }
              }
            });
          } else if (rule instanceof CaretValueRule) {
            if (rule.path !== '') {
              element.setInstancePropertyByPath(
                rule.caretPath,
                rule.value,
                this.resolve.bind(this)
              );
            } else {
              structDef.setInstancePropertyByPath(
                rule.caretPath,
                rule.value,
                this.resolve.bind(this)
              );
            }
          }
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
   * Does post processing validation on the sd
   * @param {StructureDefinition} structDef - The sd to validate
   * @throws {InvalidExtensionSliceError} when the sd contains an extension with invalid slices
   */
  private validateStructureDefinition(structDef: StructureDefinition): void {
    // Need to check that extensions define a URL correctly
    const extensionSlices = structDef.elements.filter(
      e => e.path.endsWith('extension') && e.sliceName
    );
    extensionSlices.forEach(ext => {
      const profileUrl =
        ext.type?.length > 0 && ext.type[0].profile?.length > 0 && ext.type[0].profile[0];
      const urlChild = ext.children().find(c => c.id === `${ext.id}.url`);
      // If an element is a slice of extension, it should have a url in type, or a fixedUri
      if (!profileUrl && !urlChild?.fixedUri) {
        throw new InvalidExtensionSliceError(ext.sliceName);
      }
    });
  }

  /**
   * Looks through FHIR definitions to find the definition of the passed-in type
   * @param {string} type - The type to search for the FHIR definition of
   * @returns {StructureDefinition | undefined}
   */
  resolve(type: string): StructureDefinition | undefined {
    const alias = this.tank.resolveAlias(type);
    type = alias ? alias : type;
    const json = this.FHIRDefs.find(type);
    if (json) {
      return StructureDefinition.fromJSON(json);
      // Maybe it's a FSH-defined definition and not a FHIR one
    } else {
      let structDef = cloneDeep(
        this.structDefs.find(sd => sd.name === type || sd.id === type || sd.url === type)
      );
      if (!structDef) {
        // If we find a FSH definition, then we can export and resolve for its type again
        const fshDefinition = this.tank.findProfile(type) ?? this.tank.findExtension(type);
        if (fshDefinition) {
          this.exportStructDef(fshDefinition);
          structDef = this.resolve(fshDefinition.name);
        }
      }
      return structDef;
    }
  }

  /**
   * Exports Profile or Extension to StructureDefinition
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @returns {StructureDefinition}
   * @throws {ParentNotDefinedError} when the Profile or Extension's parent is not found
   */
  exportStructDef(fshDefinition: Profile | Extension): void {
    if (this.structDefs.some(sd => sd.name === fshDefinition.name)) {
      return;
    }

    const parentName = fshDefinition.parent || 'Resource';
    const structDef = this.resolve(parentName);

    // If we still don't have a resolution, then it's not defined
    if (!structDef) {
      throw new ParentNotDefinedError(fshDefinition.name, parentName, fshDefinition.sourceInfo);
    }

    this.setMetadata(structDef, fshDefinition);
    this.setRules(structDef, fshDefinition);
    this.validateStructureDefinition(structDef);

    if (structDef.type === 'Extension') {
      this.extensionDefs.push(structDef);
    } else {
      this.profileDefs.push(structDef);
    }
  }

  /**
   * Exports Profiles and Extensions to StructureDefinitions
   * @returns {AllStructureDefinitions}
   */
  export(): AllStructureDefinitions {
    this.tank.getAllStructureDefinitions().forEach(sd => {
      try {
        this.exportStructDef(sd);
      } catch (e) {
        logger.error(e.message, e.sourceInfo);
      }
    });
    return {
      profileDefs: this.profileDefs,
      extensionDefs: this.extensionDefs
    };
  }
}

// Type to hold both profile and extension structure definitions
export type AllStructureDefinitions = {
  profileDefs: StructureDefinition[];
  extensionDefs: StructureDefinition[];
};
