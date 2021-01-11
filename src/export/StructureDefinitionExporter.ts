import {
  StructureDefinition,
  ElementDefinition,
  ElementDefinitionBindingStrength,
  idRegex,
  InstanceDefinition
} from '../fhirtypes';
import { Profile, Extension, Invariant } from '../fshtypes';
import { FSHTank } from '../import';
import { InstanceExporter } from '../export';
import {
  ParentNotDefinedError,
  ParentDeclaredAsProfileNameError,
  InvalidFHIRIdError,
  InvalidExtensionParentError,
  ParentDeclaredAsProfileIdError
} from '../errors';
import {
  CardRule,
  AssignmentRule,
  FlagRule,
  OnlyRule,
  BindingRule,
  ContainsRule,
  CaretValueRule,
  ObeysRule
} from '../fshtypes/rules';
import { logger, Type, Fishable, Metadata, MasterFisher } from '../utils';
import {
  replaceReferences,
  splitOnPathPeriods,
  applyMixinRules,
  cleanResource,
  applyInsertRules,
  getUrlFromFshDefinition
} from '../fhirtypes/common';
import { Package } from './Package';

// Extensions that should not be inherited by derived profiles
// See: https://jira.hl7.org/browse/FHIR-27535
const UNINHERITED_EXTENSIONS = [
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-explicit-type-name',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-summary'
];

/**
 * The StructureDefinitionExporter is the class for exporting Profiles and Extensions.
 * The operations and structure of both exporters are very similar, so they currently share an exporter.
 */
export class StructureDefinitionExporter implements Fishable {
  deferredRules = new Map<StructureDefinition, CaretValueRule[]>();

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
    structDef.extension = structDef.extension?.filter(e => !UNINHERITED_EXTENSIONS.includes(e.url));
    if (!structDef.extension?.length) {
      // for consistency, delete rather than leaving null-valued
      delete structDef.extension;
    }
    structDef.modifierExtension = structDef.modifierExtension?.filter(
      e => !UNINHERITED_EXTENSIONS.includes(e.url)
    );
    if (!structDef.modifierExtension?.length) {
      // for consistency, delete rather than leaving null-valued
      delete structDef.modifierExtension;
    }
    structDef.url = getUrlFromFshDefinition(fshDefinition, this.tank.config.canonical);
    delete structDef.identifier;
    structDef.version = this.tank.config.version; // can be overridden using a rule
    structDef.setName(fshDefinition.name, fshDefinition.sourceInfo);
    if (fshDefinition.title) {
      structDef.title = fshDefinition.title;
      if (
        fshDefinition instanceof Extension &&
        !(this.tank.config.applyExtensionMetadataToRoot === false)
      ) {
        structDef.elements[0].short = fshDefinition.title;
      }
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
      if (
        fshDefinition instanceof Extension &&
        !(this.tank.config.applyExtensionMetadataToRoot === false)
      ) {
        structDef.elements[0].definition = fshDefinition.description;
      }
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
          } else if (rule instanceof AssignmentRule) {
            if (rule.isInstance) {
              const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
              const instance = instanceExporter.fishForFHIR(rule.value as string);
              if (instance == null) {
                logger.error(`Cannot find definition for Instance: ${rule.value}. Skipping rule.`);
                continue;
              }
              rule.value = instance;
            }
            const replacedRule = replaceReferences(rule, this.tank, this);
            element.assignValue(replacedRule.value, replacedRule.exactly, this);
          } else if (rule instanceof FlagRule) {
            element.applyFlags(
              rule.mustSupport,
              rule.summary,
              rule.modifier,
              rule.trialUse,
              rule.normative,
              rule.draft
            );
          } else if (rule instanceof OnlyRule) {
            const target = structDef.getReferenceName(rule.path, element);
            element.constrainType(rule, this, target);
          } else if (rule instanceof BindingRule) {
            const vsURI = this.fishForMetadata(rule.valueSet, Type.ValueSet)?.url ?? rule.valueSet;
            element.bindToVS(vsURI, rule.strength as ElementDefinitionBindingStrength);
          } else if (rule instanceof ContainsRule) {
            const isExtension =
              element.type?.length === 1 &&
              element.type[0].code === 'Extension' &&
              !element.sliceName;
            if (isExtension) {
              this.handleExtensionContainsRule(fshDefinition, rule, structDef, element);
            } else {
              // Not an extension -- just add a slice for each item
              rule.items.forEach(item => {
                if (item.type) {
                  logger.error(
                    `Cannot specify type on ${item.name} slice since ${rule.path} is not an extension path.`,
                    rule.sourceInfo
                  );
                }
                element.addSlice(item.name);
              });
            }
          } else if (rule instanceof CaretValueRule) {
            const replacedRule = replaceReferences(rule, this.tank, this);
            if (replacedRule.path !== '') {
              element.setInstancePropertyByPath(replacedRule.caretPath, replacedRule.value, this);
            } else {
              if (replacedRule.isInstance) {
                if (this.deferredRules.has(structDef)) {
                  this.deferredRules.get(structDef).push(replacedRule);
                } else {
                  this.deferredRules.set(structDef, [replacedRule]);
                }
              } else {
                structDef.setInstancePropertyByPath(
                  replacedRule.caretPath,
                  replacedRule.value,
                  this
                );
              }
            }
          } else if (rule instanceof ObeysRule) {
            const invariant = this.tank.fish(rule.invariant, Type.Invariant) as Invariant;
            if (!invariant) {
              logger.error(
                `Cannot apply ${rule.invariant} constraint on ${structDef.id} because it was never defined.`,
                rule.sourceInfo
              );
            } else {
              element.applyConstraint(invariant, structDef.url);
              if (!idRegex.test(invariant.name)) {
                throw new InvalidFHIRIdError(invariant.name);
              }
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

  applyDeferredRules() {
    this.deferredRules.forEach((rules, sd) => {
      for (const rule of rules) {
        if (typeof rule.value === 'string') {
          const fishedValue = this.fishForFHIR(rule.value);
          // an inline instance will fish up an InstanceDefinition, which can be used directly.
          // other instances will fish up an Object, which needs to be turned into an InstanceDefinition.
          // an InstanceDefinition of a resource needs a resourceType, so check for that property.
          // if we can't find a resourceType or an sdType, we have a non-resource Instance, which is no good
          if (fishedValue) {
            if (fishedValue instanceof InstanceDefinition && fishedValue.resourceType) {
              try {
                sd.setInstancePropertyByPath(rule.caretPath, fishedValue, this);
              } catch (e) {
                logger.error(e, rule.sourceInfo);
              }
            } else if (fishedValue instanceof Object && fishedValue.resourceType) {
              const fishedInstance = InstanceDefinition.fromJSON(fishedValue);
              try {
                sd.setInstancePropertyByPath(rule.caretPath, fishedInstance, this);
              } catch (e) {
                logger.error(e, rule.sourceInfo);
              }
            } else {
              logger.error(`Could not find a resource named ${rule.value}`, rule.sourceInfo);
            }
          } else {
            logger.error(`Could not find a resource named ${rule.value}`, rule.sourceInfo);
          }
        }
      }
    });
  }

  /**
   * Handles a ContainsRule that is on an extension path, appropriately exporting it as a reference to a standalone
   * extension or an inline extension.
   * @param {Profile|Extension} fshDefinition - the FSH Definition the rule is on
   * @param {ContainsRule} rule - the ContainsRule that is on an extension element
   * @param {StructureDefinition} structDef - the StructDef of the resulting profile or element
   * @param {ElementDefinition} element - the element to apply the rule to
   */
  private handleExtensionContainsRule(
    fshDefinition: Profile | Extension,
    rule: ContainsRule,
    structDef: StructureDefinition,
    element: ElementDefinition
  ) {
    if (!element.slicing) {
      element.sliceIt('value', 'url');
    }
    rule.items.forEach(item => {
      if (item.type) {
        const extension = this.fishForMetadata(item.type, Type.Extension);
        if (extension == null) {
          logger.error(
            `Cannot create ${item.name} extension; unable to locate extension definition for: ${item.type}.`,
            rule.sourceInfo
          );
          return;
        }
        const slice = element.addSlice(item.name);
        if (!slice.type[0].profile) {
          slice.type[0].profile = [];
        }
        slice.type[0].profile.push(extension.url);
      } else {
        // If the extension is inline, assign its url element automatically to the sliceName
        const slice = element.addSlice(item.name);
        const urlElement = structDef.findElementByPath(
          `${rule.path}[${slice.sliceName}].url`,
          this
        );
        urlElement.assignValue(slice.sliceName, true);
        // Inline extensions should not be used on profiles
        if (fshDefinition instanceof Profile) {
          logger.error('Inline extensions should not be used on profiles.', rule.sourceInfo);
        }
      }
    });
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
   * @throws {ParentDeclaredAsProfileNameError} when the Profile declares itself as the parent
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

    if (fshDefinition.name === parentName) {
      const result = this.fishForMetadata(parentName, Type.Resource);
      throw new ParentDeclaredAsProfileNameError(
        fshDefinition.name,
        fshDefinition.sourceInfo,
        result?.url
      );
    }

    if (fshDefinition.id === parentName) {
      const result = this.fishForMetadata(parentName, Type.Resource);
      throw new ParentDeclaredAsProfileIdError(
        fshDefinition.name,
        fshDefinition.id,
        fshDefinition.sourceInfo,
        result?.url
      );
    }

    const json = this.fishForFHIR(parentName);

    // If we still don't have a resolution, then it's not defined
    if (!json) {
      throw new ParentNotDefinedError(fshDefinition.name, parentName, fshDefinition.sourceInfo);
    } else if (fshDefinition instanceof Extension && json.type !== 'Extension') {
      throw new InvalidExtensionParentError(
        fshDefinition.name,
        parentName,
        fshDefinition.sourceInfo
      );
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

    applyMixinRules(fshDefinition, this.tank);
    // fshDefinition.rules may include insert rules, which must be expanded before applying other rules
    applyInsertRules(fshDefinition, this.tank);
    this.preprocessStructureDefinition(fshDefinition, structDef.type === 'Extension');

    this.setRules(structDef, fshDefinition);
    cleanResource(structDef, (prop: string) => prop == 'elements' || prop.indexOf('_') == 0);
    structDef.inProgress = false;

    // check for another structure definition with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    // the structure definition has already been added to the package, so it's fine if it matches itself
    if (
      this.pkg.profiles.some(profile => structDef.id === profile.id && structDef !== profile) ||
      this.pkg.extensions.some(
        extension => structDef.id === extension.id && structDef !== extension
      )
    ) {
      logger.error(
        `Multiple structure definitions with id ${structDef.id}. Each structure definition must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

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
