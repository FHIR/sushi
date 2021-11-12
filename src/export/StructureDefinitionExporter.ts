import { isEmpty, padEnd } from 'lodash';
import {
  ElementDefinition,
  ElementDefinitionBindingStrength,
  idRegex,
  InstanceDefinition,
  StructureDefinition,
  STRUCTURE_DEFINITION_R4_BASE
} from '../fhirtypes';
import { Extension, Invariant, isAllowedRule, Logical, Profile, Resource } from '../fshtypes';
import { FSHTank } from '../import';
import { InstanceExporter } from '../export';
import {
  DuplicateSliceError,
  InvalidExtensionParentError,
  InvalidLogicalParentError,
  InvalidResourceParentError,
  InvalidFHIRIdError,
  ParentDeclaredAsNameError,
  ParentDeclaredAsIdError,
  ParentNameConflictError,
  ParentNotDefinedError,
  ParentNotProvidedError,
  MismatchedBindingTypeError,
  InvalidElementForSlicingError
} from '../errors';
import {
  AddElementRule,
  AssignmentRule,
  BindingRule,
  CardRule,
  CaretValueRule,
  ContainsRule,
  FlagRule,
  ObeysRule,
  OnlyRule
} from '../fshtypes/rules';
import { logger, Type, Fishable, Metadata, MasterFisher, resolveSoftIndexing } from '../utils';
import {
  applyInsertRules,
  cleanResource,
  getTypeFromFshDefinitionOrParent,
  getUrlFromFshDefinition,
  replaceReferences,
  splitOnPathPeriods
} from '../fhirtypes/common';
import { Package } from './Package';
import { isUri } from 'valid-url';
import chalk from 'chalk';

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
 * The StructureDefinitionExporter is the class for exporting Logical models, Profiles, Extensions,
 * and Resources. The operations and structure of these exporters are very similar, so they
 * currently share an exporter.
 */
export class StructureDefinitionExporter implements Fishable {
  deferredRules = new Map<StructureDefinition, CaretValueRule[]>();

  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: MasterFisher
  ) {}

  /**
   * Checks generated resources for any custom resources which are not in the
   * http://hl7.org/fhir/StructureDefinition namespace, and are therefore not
   * conformant.
   */
  private warnOnNonConformantResourceDefinitions(): void {
    const nonConformantResources = this.pkg.resources.filter(
      r => !r.url.startsWith('http://hl7.org/fhir/StructureDefinition/')
    );
    if (nonConformantResources.length) {
      // logger.warn color
      const clr = chalk.rgb(179, 98, 0);
      const maxLength = 61;
      const nonConformantResourceLogs = nonConformantResources.map(r => {
        const printableName =
          r.name.length > maxLength ? r.name.slice(0, maxLength - 3) + '...' : r.name;
        return clr('│') + padEnd(` - ${printableName}`, 65) + clr('│');
      });

      // prettier-ignore
      const message = [
        clr('\n╭─────────────────────────────────────────────────────────────────') + '' + clr('╮'),
          clr('│') + ' Detected the following non-conformant Resource definitions:     ' + clr('│'),
          ...nonConformantResourceLogs,
          clr('│') + '                                                                 ' + clr('│'),
          clr('│') + ' Resources not in the "http://hl7.org/fhir/StructureDefinition"  ' + clr('│'),
          clr('│') + ' namespace are not conformant to the FHIR specification.         ' + clr('│'),
          clr('│') + ' These resources are incompatible with standard XML/JSON         ' + clr('│'),
          clr('│') + ' schemas, public test servers, public registries, standard       ' + clr('│'),
          clr('│') + ' validation, and standard publication tooling. These resources   ' + clr('│'),
          clr('│') + ' should not be used for inter-organizational data exchange.      ' + clr('│'),
          clr('╰─────────────────────────────────────────────────────────────────') + '' + clr('╯\n')
      ];
      logger.warn(message.join('\n'));
    }
  }

  /**
   * Processes the fshDefinition's parent, validating it according to its type.
   * Returns the parent's StructureDefinition as the basis for the new StructureDefinition
   * for the provided fshDefinition.
   * @param {Extension | Profile | Logical | Resource} fshDefinition - The definition
   *        to be preprocessed. It is updated directly based on this processing.
   * @returns {StructureDefinition} for this fshDefinition
   * @private
   */
  private getStructureDefinition(
    fshDefinition: Profile | Extension | Logical | Resource
  ): StructureDefinition {
    if (isEmpty(fshDefinition.parent)) {
      // Handle cases where the parent is not specified by throwing an error.
      // - Profile has a hard requirement to define a parent and does not have a default
      //   parent defined in the Profile class. Therefore, we need to throw this error.
      // - Extension, Logical, and Resource all have a default parent, so we should never
      //   get to this point where it is not defined. That said, if something somewhere
      //   in the code were to change/remove the default, this error will then be thrown.
      throw new ParentNotProvidedError(fshDefinition.name, fshDefinition.sourceInfo);
    }

    if (fshDefinition.name === fshDefinition.parent || fshDefinition.id === fshDefinition.parent) {
      // We want to ensure that the FSH definition does not set either the name or the id
      // to be the same value as the parent. Additionally, we want to provide a helpful
      // error message when this condition exists by suggesting the use of the parent's URL
      // if we can by using fishForMetadata() for the parent. The caveat is that we cannot
      // fish for a type that is the same as the FSH definition (e.g., cannot fish for
      // Type.Profile when FSH definition is an instanceof Profile) because the result of
      // the fishing would only find itself.
      //
      // Logical models can have resources, complex-types, and other logical models as a parent.
      // Profiles can have resources, complex-types, and other profiles as a parent.
      // Therefore, fish for resources and types...
      const possibleParentMeta = this.fishForMetadata(
        fshDefinition.parent,
        Type.Resource,
        Type.Type
      );

      if (fshDefinition.name === fshDefinition.parent) {
        throw new ParentDeclaredAsNameError(
          fshDefinition.constructorName,
          fshDefinition.name,
          fshDefinition.sourceInfo,
          possibleParentMeta?.url
        );
      }

      if (fshDefinition.id === fshDefinition.parent) {
        throw new ParentDeclaredAsIdError(
          fshDefinition.constructorName,
          fshDefinition.name,
          fshDefinition.id,
          fshDefinition.sourceInfo,
          possibleParentMeta?.url
        );
      }
    }

    // Now that we have a usable fshDefinition.parent, retrieve its StructureDefinition.
    // Then make sure it is a valid StructureDefinition based on the type of the fshDefinition.

    let parentJson = this.fishForFHIR(fshDefinition.parent);

    if (
      !parentJson &&
      fshDefinition instanceof Logical &&
      (fshDefinition.parent === 'Base' ||
        fshDefinition.parent === 'http://hl7.org/fhir/StructureDefinition/Base')
    ) {
      parentJson = STRUCTURE_DEFINITION_R4_BASE;
    }
    if (!parentJson) {
      // If parentJson is not defined, then either:
      // 1. the provided parent's StructureDefinition is not defined, or
      // 2. the parent's StructureDefinition is defined, but it has the same name as a FSH definition of a type that can't be the parent
      const parentFhir = this.fisher.fhir.fishForFHIR(fshDefinition.parent);
      const parentFsh = this.fisher.tank.fish(fshDefinition.parent);

      if (parentFhir && parentFsh) {
        throw new ParentNameConflictError(
          fshDefinition.name,
          fshDefinition.parent,
          parentFsh.constructorName.replace('Fsh', ''),
          fshDefinition.sourceInfo
        );
      } else {
        throw new ParentNotDefinedError(
          fshDefinition.name,
          fshDefinition.parent,
          fshDefinition.sourceInfo
        );
      }
    }

    if (fshDefinition instanceof Extension && parentJson.type !== 'Extension') {
      // An extension can only have an Extension as a parent
      throw new InvalidExtensionParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    } else if (
      fshDefinition instanceof Logical &&
      !(
        (['logical', 'resource', 'complex-type'].includes(parentJson.kind) &&
          parentJson.derivation === 'specialization') ||
        ['Base', 'Element'].includes(parentJson.type)
      )
    ) {
      // A logical model can only have another logical model, a resource, or a complex-type
      // as a parent or it can have the Base or Element resource as a parent
      throw new InvalidLogicalParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    } else if (
      fshDefinition instanceof Resource &&
      !['Resource', 'DomainResource'].includes(parentJson.type)
    ) {
      // A resource can only have the 'Resource' or 'DomainResource' as a parent
      throw new InvalidResourceParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    }

    const structDef = StructureDefinition.fromJSON(parentJson);

    // Since the structDef is from the parent, set the URL to be the baseDefinition
    structDef.baseDefinition = structDef.url;
    // Now, define the url and type here since these are core properties use by subsequent methods
    structDef.url = getUrlFromFshDefinition(fshDefinition, this.tank.config.canonical);
    structDef.type = getTypeFromFshDefinitionOrParent(fshDefinition, structDef);

    this.resetParentElements(structDef, fshDefinition);

    return structDef;
  }

  /**
   * Sets the metadata for the StructureDefinition.  This includes clearing metadata that was copied from the parent
   * that may not be relevant to the child StructureDefinition.  Overall approach was discussed on Zulip.  This
   * function represents implementation of that approach plus setting extra metadata provided by FSH.
   * This essentially aligns closely with the approach that Forge uses (ensuring some consistency across tools).
   * @see {@link https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Bad.20links.20on.20Detailed.20Description.20tab/near/186766845}
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension | Logical | Resource} fshDefinition - The definition we are exporting
   * @private
   */
  private setMetadata(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension | Logical | Resource
  ): void {
    // Set/clear elements in order of their appearance in Resource/DomainResource/StructureDefinition definitions
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
    // keep url since it was already defined when the StructureDefinition was initially created
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
    // keep kind since it should not change except for logical models
    if (fshDefinition instanceof Logical) {
      structDef.kind = 'logical';
    }
    structDef.abstract = false; // always reset to false, assuming most children of abstracts aren't abstract; can be overridden w/ rule
    // keep baseDefinition since it was already defined when the StructureDefinition was initially created
    // keep type since it was already defined when the StructureDefinition was initially created
    structDef.derivation =
      fshDefinition instanceof Logical || fshDefinition instanceof Resource
        ? 'specialization'
        : 'constraint';

    if (fshDefinition instanceof Extension) {
      // context and contextInvariant only apply to extensions.
      // Keep context, assuming context is still valid for child extensions.
      // Keep contextInvariant, assuming context is still valid for child extensions.

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
    } else {
      // Should not be defined for non-extensions, but clear just to be sure
      delete structDef.context;
      delete structDef.contextInvariant;
    }
  }

  /**
   * At this point, 'structDef' contains the parent's ElementDefinitions. For profiles
   * and extensions, these ElementDefinitions are already correct, so no processing is
   * necessary. For logical models and resources, the id and path attributes need to be
   * changed to reflect the type of the logical model/resource. By definition for logical
   * models and resources, the 'type' is the same as the 'id'. Therefore, the elements
   * must be changed to reflect the new StructureDefinition type.
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension | Logical | Resource} fshDefinition - The definition we are exporting
   * @private
   */
  private resetParentElements(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension | Logical | Resource
  ): void {
    if (fshDefinition instanceof Profile || fshDefinition instanceof Extension) {
      return;
    }

    const elements = structDef.elements.map(e => e.clone());

    // The Elements will have the same values for both 'id' and 'path'.
    // Therefore, use the 'id' as the source of the conversion and reset
    // the 'id' value with the new base value. The 'id' mutator will
    // automatically reset the 'path' value'.
    elements.forEach(e => {
      e.id = e.id.replace(/^[^.]+/, structDef.pathType);
    });

    // The root element's base.path should be the same as root element's path
    elements[0].base.path = elements[0].path;

    if (
      fshDefinition.parent === 'Element' ||
      fshDefinition.parent === 'http://hl7.org/fhir/StructureDefinition/Element'
    ) {
      // The FHIR Element StructureDefinition contains extensions related to being
      // defined as 'normative'. These extensions should not be carried forward in
      // the new StructureDefinition.
      delete elements[0].extension;
    }

    structDef.elements = elements;
    structDef.captureOriginalElements();

    // The following changes to the root element will be included in the
    // differential root element.

    // Reset the root element's short and definition
    if (fshDefinition.title) {
      structDef.elements[0].short = fshDefinition.title;
    }
    if (fshDefinition.description) {
      structDef.elements[0].definition = fshDefinition.description;
    }
  }

  /**
   * Sets the rules for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set rules on
   * @param {Profile | Extension} fshDefinition - The Profile or Extension we are exporting
   * @private
   */
  private setRules(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension | Logical | Resource
  ): void {
    resolveSoftIndexing(fshDefinition.rules);
    const addElementRules = fshDefinition.rules.filter(rule => rule instanceof AddElementRule);
    for (const rule of fshDefinition.rules) {
      // Specific rules are permitted for each structure definition type
      // (i.e., Profile, Logical, etc.). Log an error for disallowed rules
      // and continue to next rule.
      if (!isAllowedRule(fshDefinition, rule)) {
        logger.error(
          `Use of '${rule.constructorName}' is not permitted for '${fshDefinition.constructorName}'. Skipping '${rule.constructorName}' at path '${rule.path}' for '${fshDefinition.name}'.`,
          rule.sourceInfo
        );
        continue;
      }

      if (rule instanceof AddElementRule) {
        try {
          // Note: newElement() method automatically adds the new element to its structDef.elements
          const newElement = structDef.newElement(rule.path);
          newElement.applyAddElementRule(rule, this);
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
        }
        continue;
      }

      const element = structDef.findElementByPath(rule.path, this);

      if (element && (fshDefinition instanceof Logical || fshDefinition instanceof Resource)) {
        // The FHIR spec prohibits constraining any parent element in a 'specialization'
        // (i.e., logical model and resource), therefore log an error if that is attempted
        // and continue to the next rule.
        if (
          rule.path &&
          rule.path !== '.' &&
          !addElementRules.some(
            rule =>
              element.path === `${element.structDef.pathType}.${rule.path}` ||
              element.path.startsWith(`${element.structDef.pathType}.${rule.path}.`)
          )
        ) {
          logger.error(
            `FHIR prohibits logical models and resources from constraining parent elements. Skipping '${rule.constructorName}' at path '${rule.path}' for '${fshDefinition.name}'.`,
            rule.sourceInfo
          );
          continue;
        }
      }

      if (element) {
        try {
          if (rule instanceof CardRule) {
            element.constrainCardinality(rule.min, rule.max);
          } else if (rule instanceof AssignmentRule) {
            if (rule.isInstance) {
              const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
              const instance = instanceExporter.fishForFHIR(rule.value as string);
              if (instance == null) {
                if (element.type?.length === 1) {
                  logger.error(
                    `Cannot assign Instance at path ${rule.path} to element of type ${element.type[0].code}. Definition not found for Instance: ${rule.value}.`
                  );
                } else {
                  logger.error(
                    `Cannot find definition for Instance: ${rule.value}. Skipping rule.`
                  );
                }
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
            const target = structDef.getReferenceOrCanonicalName(rule.path, element);
            element.constrainType(rule, this, target);
          } else if (rule instanceof BindingRule) {
            const vsURI = this.fishForMetadata(rule.valueSet, Type.ValueSet)?.url ?? rule.valueSet;
            const csURI = this.fishForMetadata(rule.valueSet, Type.CodeSystem)?.url;
            if (csURI && !isUri(vsURI)) {
              throw new MismatchedBindingTypeError(rule.valueSet, rule.path, 'ValueSet');
            }
            element.bindToVS(vsURI, rule.strength as ElementDefinitionBindingStrength);
          } else if (rule instanceof ContainsRule) {
            const isExtension =
              element.type?.length === 1 &&
              element.type[0].code === 'Extension' &&
              !element.sliceName;
            if (isExtension) {
              this.handleExtensionContainsRule(fshDefinition, rule, structDef, element);
            } else {
              if (!element.isArrayOrChoice()) {
                throw new InvalidElementForSlicingError(rule.path);
              }
              // Not an extension -- just add a slice for each item
              rule.items.forEach(item => {
                if (item.type) {
                  logger.error(
                    `Cannot specify type on ${item.name} slice since ${rule.path} is not an extension path.`,
                    rule.sourceInfo
                  );
                }
                try {
                  element.addSlice(item.name);
                } catch (e) {
                  logger.error(e.message, rule.sourceInfo);
                }
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
          `No element found at path ${rule.path} for ${rule.constructorName} in ${fshDefinition.name}, skipping rule`,
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
          // An inline instance will fish up an InstanceDefinition, which can be used directly.
          // Other instances will fish up an Object, which needs to be turned into an InstanceDefinition.
          // An InstanceDefinition of a resource needs a resourceType, so check for that property.
          // If we can't find a resourceType or an sdType, we have a non-resource Instance, which is no good
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
   * @param {Profile | Extension | Logical | Resource} fshDefinition - the FSH Definition the rule is on
   * @param {ContainsRule} rule - the ContainsRule that is on an extension element
   * @param {StructureDefinition} structDef - the StructDef of the resulting profile or element
   * @param {ElementDefinition} element - the element to apply the rule to
   * @private
   */
  private handleExtensionContainsRule(
    fshDefinition: Profile | Extension | Logical | Resource,
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
        try {
          const slice = element.addSlice(item.name);
          if (!slice.type[0].profile) {
            slice.type[0].profile = [];
          }
          slice.type[0].profile.push(extension.url);
        } catch (e) {
          // If this is a DuplicateSliceError, and it references the same extension definition,
          // then it is most likely a harmless no-op.  In this case, treat it as a warning.
          if (e instanceof DuplicateSliceError) {
            const slice = element.getSlices().find(el => el.sliceName === item.name);
            if (slice?.type[0]?.profile?.some(p => p === extension.url)) {
              logger.warn(e.message, rule.sourceInfo);
              return;
            }
          }
          // Otherwise it is a conflicting duplicate extension or some other error
          logger.error(e.message, rule.sourceInfo);
        }
      } else {
        try {
          // If the extension is inline, assign its url element automatically to the sliceName
          const slice = element.addSlice(item.name);
          const urlElement = structDef.findElementByPath(
            `${rule.path}[${slice.sliceName}].url`,
            this
          );
          urlElement.assignValue(slice.sliceName, true);
          // Inline extensions should only be used in extensions
          if (!(fshDefinition instanceof Extension)) {
            logger.error(
              'Inline extensions should only be defined in Extensions.',
              rule.sourceInfo
            );
          }
        } catch (e) {
          // Unlike the case above, redeclaring an inline extension is more likely a problem,
          // as inline extensions require further definition outside of the contains rule, so
          // there is more likely to be conflict, and detecting such conflict is more difficult.
          logger.error(e.message, rule.sourceInfo);
        }
      }
    });
  }

  /**
   * Does any necessary preprocessing of profiles, extensions, logical models, and resources.
   * @param {Extension | Profile | Logical | Resource} fshDefinition - The definition
   *        to do preprocessing on. It is updated directly based on processing.
   * @param {boolean} isExtension - fshDefinition is/is not an Extension
   * @private
   */
  private preprocessStructureDefinition(
    fshDefinition: Extension | Profile | Logical | Resource,
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
          const relevantContradictoryRuleMapEntry =
            inferredCardRulesMap.get(relevantContradictoryRule);
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
          const relevantContradictoryRuleMapEntry =
            inferredCardRulesMap.get(relevantContradictoryRule);
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
      (types.length === 0 ||
        types.some(
          t =>
            t === Type.Profile || t === Type.Extension || t === Type.Logical || t === Type.Resource
        ))
    ) {
      // If we find a FSH definition, then we can export and fish for it again
      const fshDefinition = this.tank.fish(
        item,
        Type.Profile,
        Type.Extension,
        Type.Logical,
        Type.Resource
      ) as Profile | Extension | Logical | Resource;
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
   * Exports Profile, Extension, Logical model, and custom Resource to StructureDefinition
   * @param {Profile | Extension | Logical | Resource} fshDefinition - The Profile or Extension
   *         or Logical model or custom Resource we are exporting
   * @returns {StructureDefinition}
   * @throws {ParentDeclaredAsNameError} when the fshDefinition declares itself as the parent
   * @throws {ParentDeclaredAsIdError} when the fshDefinition declares itself as the parent
   * @throws {ParentNotDefinedError} when the fshDefinition's parent is not found
   * @throws {InvalidExtensionParentError} when Extension does not have valid parent
   * @throws {InvalidLogicalParentError} when Logical does not have valid parent
   */
  exportStructDef(fshDefinition: Profile | Extension | Logical | Resource): StructureDefinition {
    if (
      this.pkg.profiles.some(sd => sd.name === fshDefinition.name) ||
      this.pkg.extensions.some(sd => sd.name === fshDefinition.name) ||
      this.pkg.logicals.some(sd => sd.name === fshDefinition.name) ||
      this.pkg.resources.some(sd => sd.name === fshDefinition.name)
    ) {
      return;
    }

    const structDef = this.getStructureDefinition(fshDefinition);

    if (structDef.inProgress) {
      logger.warn(
        `The definition of ${fshDefinition.name} may be incomplete because there is a circular ` +
          `dependency with its parent ${fshDefinition.parent} causing the parent to be used before the ` +
          'parent has been fully processed.',
        fshDefinition.sourceInfo
      );
    }

    structDef.inProgress = true;

    // At this point, 'structDef' contains the parent's metadata and elements; therefore,
    // transform the current 'structDef' from the parent to the new StructureDefinition to
    // be exported.

    // Reset the original parent's metadata to that for the new StructureDefinition
    this.setMetadata(structDef, fshDefinition);

    // These are being pushed now in order to allow for
    // incomplete definitions to be used to resolve circular reference issues.
    if (structDef.type === 'Extension') {
      this.pkg.extensions.push(structDef);
    } else if (structDef.kind === 'logical' && structDef.derivation === 'specialization') {
      this.pkg.logicals.push(structDef);
    } else if (structDef.kind === 'resource' && structDef.derivation === 'specialization') {
      this.pkg.resources.push(structDef);
    } else {
      this.pkg.profiles.push(structDef);
    }

    // fshDefinition.rules may include insert rules, which must be expanded before applying other rules
    applyInsertRules(fshDefinition, this.tank);

    this.preprocessStructureDefinition(fshDefinition, structDef.type === 'Extension');

    this.setRules(structDef, fshDefinition);

    // The recursive structDef fields on elements should be ignored to avoid infinite looping
    // And, the _sliceName and _primitive properties added by SUSHI should be skipped.
    cleanResource(structDef, (prop: string) =>
      ['structDef', '_sliceName', '_primitive'].includes(prop)
    );
    structDef.inProgress = false;

    structDef.validate().forEach(err => {
      logger.error(err.message, fshDefinition.sourceInfo);
    });

    // check for another structure definition with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    // the structure definition has already been added to the package, so it's fine if it matches itself
    if (
      this.pkg.profiles.some(prof => structDef.id === prof.id && structDef !== prof) ||
      this.pkg.extensions.some(extn => structDef.id === extn.id && structDef !== extn) ||
      this.pkg.logicals.some(logical => structDef.id === logical.id && structDef !== logical) ||
      this.pkg.resources.some(resource => structDef.id === resource.id && structDef !== resource)
    ) {
      logger.error(
        `Multiple structure definitions with id ${structDef.id}. Each structure definition must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    return structDef;
  }

  /**
   * Exports Profiles, Extensions, Logical models, and Resources to StructureDefinitions
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
    this.warnOnNonConformantResourceDefinitions();
    if (structureDefinitions.length > 0) {
      logger.info(`Converted ${structureDefinitions.length} FHIR StructureDefinitions.`);
    }
    return this.pkg;
  }
}
