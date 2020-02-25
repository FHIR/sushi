import { StructureDefinition, ElementDefinitionBindingStrength } from '../fhirtypes';
import { Profile, Extension } from '../fshtypes';
import { FSHTank } from '../import';
import { ParentNotDefinedError } from '../errors';
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
import { replaceReferences, splitOnPathPeriods } from '../fhirtypes/common';
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
   * Sets the metadata for the StructureDefinition.  This includes clearing metadata that was copied from the parent
   * that may not be relevant to the child StructureDefinition.  Overall approach was discussed on Zulip.  This
   * function represents implementation of that approach plus setting extra metadata provided by FSH.
   * This essentially aligns closely with the approach that Forge uses (ensuring some consistency across tools).
   * @see {@link https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Bad.20links.20on.20Detailed.20Description.20tab/near/186766845}
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   */
  private setMetadata(structDef: StructureDefinition, fshDefinition: Profile | Extension): void {
    // First save the original URL, as that is the URL we'll want to set as the baseDefinition
    const baseURL = structDef.url;

    // Now set/clear elements in order of their appearance in Resource/DomainResource/StructureDefinition definitions
    structDef.setId(fshDefinition.id, fshDefinition.sourceInfo);
    delete structDef.meta;
    delete structDef.implicitRules;
    delete structDef.language;
    delete structDef.text;
    delete structDef.contained;
    delete structDef.extension; // see https://github.com/FHIR/sushi/issues/116
    delete structDef.modifierExtension;
    structDef.url = `${this.tank.config.canonical}/StructureDefinition/${structDef.id}`;
    delete structDef.identifier;
    structDef.version = this.tank.config.version; // can be overridden using a rule
    structDef.setName(fshDefinition.name, fshDefinition.sourceInfo);
    if (fshDefinition.title) {
      structDef.title = fshDefinition.title;
    } else {
      delete structDef.title;
    }
    structDef.status = 'active'; // it's 1..1 so we have to set it to something; can be overridden w/ rule
    delete structDef.experimental;
    delete structDef.date;
    delete structDef.publisher;
    delete structDef.contact;
    if (fshDefinition.description) {
      structDef.description = fshDefinition.description;
    } else {
      delete structDef.description;
    }
    delete structDef.useContext;
    delete structDef.jurisdiction;
    delete structDef.purpose;
    delete structDef.copyright;
    delete structDef.keyword;
    // keep structDef.fhirVersion as that ought not change from parent to child
    // keep mapping since existing elements refer to the mapping and we're not removing those
    // keep kind since it should not change
    structDef.abstract = false; // always reset to false, assuming most children of abstracts aren't abstract
    // keep context, assuming context is still valid for child extensions
    // keep contextInvariant, assuming context is still valid for child extensions
    // keep type since this should not change for profiles or extensions
    structDef.baseDefinition = baseURL;
    structDef.derivation = 'constraint'; // always constraint since SUSHI only supports profiles/extensions right now

    if (fshDefinition instanceof Extension) {
      // Automatically set url.fixedUri on Extensions
      const url = structDef.findElement('Extension.url');
      url.fixedUri = structDef.url;
      if (structDef.context == null) {
        // Set context to everything by default, but users can override w/ rules, e.g.
        // ^context[0].type = #element
        // ^context[0].expression = "Patient"
        // TODO: Consider introducing metadata keywords for this
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
                } else {
                  // If the extension is inline, fix its url element automatically to the sliceName
                  const urlElement = structDef.findElementByPath(
                    `${rule.path}[${slice.sliceName}].url`,
                    this
                  );
                  urlElement.fixValue(slice.sliceName);
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
   * Does any necessary preprocessing of profiles and extensions.
   * @param {Extension} fshDefinition - The extension to do preprocessing on. It is updated directly based on processing.
   */
  private preprocessStructureDefinition(
    fshDefinition: Extension | Profile,
    isExtension: boolean
  ): void {
    const inferredCardRulesMap = new Map(); // key is the rule, value is a boolean of whether it should be set
    fshDefinition.rules.forEach(rule => {
      const rulePathParts = splitOnPathPeriods(rule.path);
      rulePathParts.forEach((pathPart, i) => {
        const previousPathPart = rulePathParts[i - 1];
        // A rule is related to an extension if it is directly on a FSH defined extension or if it is defined inline on a profile or extension.
        // Check the section before the current pathPart to see if it is an inline extension.
        const isOnExtension =
          (isExtension && rulePathParts.length === 1) || previousPathPart?.startsWith('extension');

        // If we are not looking at a rule on an extension, don't infer anything. Return to check the next rule.
        if (!isOnExtension) {
          return;
        }

        const initialPath = rulePathParts.slice(0, i).join('.');
        const basePath = `${initialPath}${initialPath ? '.' : ''}`;

        // See if we can infer any rules about an extension (inline or FSH defined)
        if (pathPart.startsWith('extension')) {
          const relevantContradictoryRule = `${basePath}extension`;
          const relevantContradictoryRuleMapEntry = inferredCardRulesMap.get(
            relevantContradictoryRule
          );
          if (!(rule instanceof CardRule && rule.max === '0')) {
            if (relevantContradictoryRuleMapEntry) {
              logger.error(
                `Extension on ${fshDefinition.name} cannot have both a value and sub-extensions`,
                rule.sourceInfo
              );
              inferredCardRulesMap.set(relevantContradictoryRule, false);
            } else {
              // If we don't already have a contradiction, add new rule to infer value[x] constraints
              const relevantRule = `${basePath}value[x]`;
              inferredCardRulesMap.set(relevantRule, true);
            }
          } else {
            if (relevantContradictoryRuleMapEntry) {
              inferredCardRulesMap.set(relevantContradictoryRule, false);
            }
          }
        } else if (pathPart.startsWith('value')) {
          const relevantContradictoryRule = `${basePath}value[x]`;
          const relevantContradictoryRuleMapEntry = inferredCardRulesMap.get(
            relevantContradictoryRule
          );
          if (!(rule instanceof CardRule && rule.max === '0')) {
            if (relevantContradictoryRuleMapEntry) {
              logger.error(
                `Extension on ${fshDefinition.name} cannot have both a value and sub-extensions`,
                rule.sourceInfo
              );
              inferredCardRulesMap.set(relevantContradictoryRule, false);
            } else {
              // If we don't already have a contradiction, add new rule to infer extension constraints
              const relevantRule = `${basePath}extension`;
              inferredCardRulesMap.set(relevantRule, true);
            }
          } else {
            if (relevantContradictoryRuleMapEntry) {
              inferredCardRulesMap.set(relevantContradictoryRule, false);
            }
          }
        }
      });
    });

    // If only value[x] or extension is used, constrain cardinality of the other to 0..0.
    // If both are used, an error has been logged, but the rules will still be applied.
    for (const [rule, shouldRuleBeSet] of inferredCardRulesMap) {
      if (shouldRuleBeSet) {
        const inferredCardRule = new CardRule(rule);
        inferredCardRule.min = 0;
        inferredCardRule.max = '0';
        fshDefinition.rules.push(inferredCardRule);
      }
    }
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

    this.preprocessStructureDefinition(fshDefinition, structDef.type === 'Extension');

    this.setRules(structDef, fshDefinition);
    structDef.inProgress = false;

    return structDef;
  }

  /**
   * Exports Profiles and Extensions to StructureDefinitions
   * @returns {Package}
   */
  export(): Package {
    const structureDefinitions = this.tank.getAllStructureDefinitions();
    structureDefinitions.forEach(sd => {
      try {
        this.exportStructDef(sd);
      } catch (e) {
        logger.error(e.message, e.sourceInfo || sd.sourceInfo);
      }
    });
    if (structureDefinitions.length > 0) {
      logger.info(`Converted ${structureDefinitions.length} FHIR StructureDefinitions.`);
    }
    return this.pkg;
  }
}
