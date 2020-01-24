import {
  StructureDefinition,
  ElementDefinitionBindingStrength,
  validateFHIRId
} from '../fhirtypes';
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
import { logger, Type, Fishable, Metadata, MasterFisher } from '../utils';
import { replaceReferences, validateFHIRName } from '../fhirtypes/common';
import { Package } from './Package';

/**
 * The StructureDefinitionExporter is the class for exporting Profiles and Extensions.
 * The operations and structure of both exporters are very similar, so they currently share an exporter.
 */
export class StructureDefinitionExporter implements Fishable {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: MasterFisher
  ) {}

  /**
   * Sets the metadata for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setMetadata(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    structDef.name = fshDefinition.name;
    structDef.id = fshDefinition.id;
    try {
      validateFHIRName(structDef.name);
    } catch (ex) {
      logger.error(ex.message, fshDefinition.sourceInfo);
    }
    try {
      validateFHIRId(structDef.id);
    } catch (ex) {
      logger.error(ex.message, fshDefinition.sourceInfo);
    }
    if (fshDefinition.title) structDef.title = fshDefinition.title;
    if (fshDefinition.description) structDef.description = fshDefinition.description;
    // Version is set to value provided in config, will be overriden if reset by rules
    structDef.version = this.tank.config.version;
    // Assuming the starting StructureDefinition was a clone of the parent,
    // set the baseDefinition to the parent url before re-assiging the url
    structDef.baseDefinition = structDef.url;
    // Now re-assign the URL based on canonical and id
    structDef.url = `${this.tank.config.canonical}/StructureDefinition/${structDef.id}`;
    // Set the derivation as appropriate
    if (fshDefinition instanceof Profile) {
      structDef.derivation = 'constraint';
    } else if (fshDefinition instanceof Extension) {
      // Automatically set url.fixedUri on Extensions
      const url = structDef.findElement('Extension.url');
      url.fixedUri = structDef.url;
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
    // Remove the base-level extensions as they may not be valid in this context
    delete structDef.extension;
  }

  /**
   * Sets the rules for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set rules on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setRules(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    for (const rule of fshDefinition.rules) {
      const element = structDef.findElementByPath(rule.path, this);
      if (element) {
        try {
          if (rule instanceof CardRule) {
            element.constrainCardinality(rule.min, rule.max);
          } else if (rule instanceof FixedValueRule) {
            const replacedRule = replaceReferences(rule, this.tank, this);
            element.fixValue(replacedRule.fixedValue);
          } else if (rule instanceof FlagRule) {
            element.applyFlags(rule.mustSupport, rule.summary, rule.modifier);
          } else if (rule instanceof OnlyRule) {
            const target = structDef.getReferenceName(rule.path, element);
            element.constrainType(rule.types, this, target);
          } else if (rule instanceof ValueSetRule) {
            const vsURI = this.fishForMetadata(rule.valueSet, Type.ValueSet)?.url ?? rule.valueSet;
            element.bindToVS(vsURI, rule.strength as ElementDefinitionBindingStrength);
          } else if (rule instanceof ContainsRule) {
            const isExtension = element.type?.length === 1 && element.type[0].code === 'Extension';
            if (isExtension && !element.slicing) {
              element.sliceIt('value', 'url');
            }
            rule.items.forEach(item => {
              const slice = element.addSlice(item);
              if (isExtension) {
                const extension = this.fishForMetadata(item);
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
              element.setInstancePropertyByPath(rule.caretPath, rule.value, this);
            } else {
              structDef.setInstancePropertyByPath(rule.caretPath, rule.value, this);
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

  fishForFHIR(item: string, ...types: Type[]) {
    let result = this.fisher.fishForFHIR(item, ...types);
    if (
      result == null &&
      (types.length === 0 || types.some(t => t === Type.Profile || t === Type.Extension))
    ) {
      // If we find a FSH definition, then we can export and fish for it again
      const fshDefinition = this.tank.fish(item, Type.Profile, Type.Extension) as
        | Profile
        | Extension;
      if (fshDefinition) {
        this.exportStructDef(fshDefinition);
        result = this.fisher.fishForFHIR(item, ...types);
      }
    }
    return result;
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata {
    // If it's in the tank, it can get the metadata from there (no need to export like in fishForFHIR)
    return this.fisher.fishForMetadata(item, ...types);
  }

  /**
   * Exports Profile or Extension to StructureDefinition
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @returns {StructureDefinition}
   * @throws {ParentNotDefinedError} when the Profile or Extension's parent is not found
   */
  exportStructDef(fshDefinition: Profile | Extension): StructureDefinition {
    if (
      this.pkg.profiles.some(sd => sd.name === fshDefinition.name) ||
      this.pkg.extensions.some(sd => sd.name === fshDefinition.name)
    ) {
      return;
    }

    const parentName = fshDefinition.parent || 'Resource';
    const json = this.fishForFHIR(parentName);

    // If we still don't have a resolution, then it's not defined
    if (!json) {
      throw new ParentNotDefinedError(fshDefinition.name, parentName, fshDefinition.sourceInfo);
    }

    const structDef = StructureDefinition.fromJSON(json);
    if (structDef.inProgress) {
      logger.warn(
        `The definition of ${fshDefinition.name} may be incomplete because there is a circular ` +
          `dependency with its parent ${parentName} causing the parent to be used before the ` +
          'parent has been fully processed.',
        fshDefinition.sourceInfo
      );
    }

    structDef.inProgress = true;

    this.setMetadata(structDef, fshDefinition);

    // These are being pushed now in order to allow for
    // incomplete definitions to be used to resolve circular reference issues.
    if (structDef.type === 'Extension') {
      this.pkg.extensions.push(structDef);
    } else {
      this.pkg.profiles.push(structDef);
    }

    this.setRules(structDef, fshDefinition);
    this.validateStructureDefinition(structDef);

    structDef.inProgress = false;

    return structDef;
  }

  /**
   * Exports Profiles and Extensions to StructureDefinitions
   * @returns {Package}
   */
  export(): Package {
    this.tank.getAllStructureDefinitions().forEach(sd => {
      try {
        this.exportStructDef(sd);
      } catch (e) {
        logger.error(e.message, e.sourceInfo || sd.sourceInfo);
      }
    });
    return this.pkg;
  }
}
