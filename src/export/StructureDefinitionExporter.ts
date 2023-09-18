import { findLast, isEmpty, padEnd } from 'lodash';
import {
  ElementDefinition,
  ElementDefinitionBindingStrength,
  idRegex,
  InstanceDefinition,
  StructureDefinition,
  CodeSystem
} from '../fhirtypes';
import {
  Extension,
  Invariant,
  isAllowedRule,
  Logical,
  Profile,
  Resource,
  Instance,
  FshCode,
  FshEntity,
  ExtensionContext
} from '../fshtypes';
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
  InvalidElementForSlicingError,
  MismatchedTypeError
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
import {
  logger,
  Type,
  Fishable,
  fishForFHIRBestVersion,
  Metadata,
  MasterFisher,
  resolveSoftIndexing
} from '../utils';
import {
  applyInsertRules,
  cleanResource,
  getTypeFromFshDefinitionOrParent,
  getUrlFromFshDefinition,
  replaceReferences,
  splitOnPathPeriods,
  isModifierExtension,
  getAllConcepts,
  TYPE_CHARACTERISTICS_CODE,
  TYPE_CHARACTERISTICS_EXTENSION,
  LOGICAL_TARGET_EXTENSION
} from '../fhirtypes/common';
import { Package } from './Package';
import { isUri } from 'valid-url';
import chalk from 'chalk';

// Extensions that should not be inherited by derived profiles
// See: https://jira.hl7.org/browse/FHIR-28441
const UNINHERITED_EXTENSIONS = [
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm-no-warnings',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-hierarchy',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-interface',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-applicable-version',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-codegen-super',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-summary',
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg',
  'http://hl7.org/fhir/StructureDefinition/replaces',
  'http://hl7.org/fhir/StructureDefinition/resource-approvalDate',
  'http://hl7.org/fhir/StructureDefinition/resource-effectivePeriod',
  'http://hl7.org/fhir/StructureDefinition/resource-lastReviewDate'
];

/**
 * The StructureDefinitionExporter is the class for exporting Logical models, Profiles, Extensions,
 * and Resources. The operations and structure of these exporters are very similar, so they
 * currently share an exporter.
 */
export class StructureDefinitionExporter implements Fishable {
  deferredRules = new Map<
    StructureDefinition,
    { rule: CaretValueRule; originalErr?: MismatchedTypeError }[]
  >();
  private typeCharacteristicCodes: string[];
  private commaSeparatedCharacteristics: string;

  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: MasterFisher
  ) {
    const typeCharacteristicCodeSystem = this.fishForFHIR(
      TYPE_CHARACTERISTICS_CODE,
      Type.CodeSystem
    ) as CodeSystem;
    if (typeCharacteristicCodeSystem) {
      this.typeCharacteristicCodes = getAllConcepts(typeCharacteristicCodeSystem);
      const supportedCharacteristics = [...this.typeCharacteristicCodes];
      // special case to make sure that we report that #can-be-target is a supported code,
      // even if it's not in the code system.
      if (!supportedCharacteristics.includes('can-be-target')) {
        supportedCharacteristics.push('can-be-target');
      }
      this.commaSeparatedCharacteristics = supportedCharacteristics
        .map(code => `"#${code}"`)
        .join(', ');
    }
  }

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

    const parentJson = this.fishForFHIR(fshDefinition.parent);
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

    if (
      parentJson._timeTraveler &&
      !(parentJson.type === 'Base' && fshDefinition instanceof Logical)
    ) {
      // R5 resources cannot be parent resources in R4 IGs, with the exception of Base for Logicals.
      // Treat all other time-traveling resources as if they were not found.
      throw new ParentNotDefinedError(
        fshDefinition.name,
        fshDefinition.parent,
        fshDefinition.sourceInfo
      );
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

    // Fix fhirVersion for R4/R4B logicals whose parent is the time-traveling Base
    if (
      parentJson._timeTraveler &&
      parentJson.url === 'http://hl7.org/fhir/StructureDefinition/Base' &&
      this.fisher.defaultFHIRVersion &&
      this.fisher.defaultFHIRVersion !== structDef.fhirVersion
    ) {
      structDef.fhirVersion = this.fisher.defaultFHIRVersion;
    }

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
    structDef.setId(fshDefinition);
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

    structDef.setName(fshDefinition);
    if (fshDefinition.title == '') {
      if (fshDefinition instanceof Profile) {
      }
      logger.warn(
        `${fshDefinition.constructorName} ${fshDefinition.name} has a title field that should not be empty.`
      );
    }
    if (fshDefinition.description == '') {
      logger.warn(
        `${fshDefinition.constructorName} ${fshDefinition.name} has a description field that should not be empty.`
      );
    }
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
    structDef.status = this.tank.config.status;
    delete structDef.version; // deleting to allow the IG Publisher default to take hold
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
    // keep structDef.fhirVersion as that ought not change from parent to child (except R4/R4B Base, which has already been fixed)
    // keep mapping since existing elements refer to the mapping and we're not removing those
    // keep kind since it should not change except for logical models
    if (fshDefinition instanceof Logical) {
      structDef.kind = 'logical';
      if (fshDefinition.characteristics.length > 0) {
        this.setCharacteristics(structDef, fshDefinition);
      }
    }
    structDef.abstract = false; // always reset to false, assuming most children of abstracts aren't abstract; can be overridden w/ rule
    // keep baseDefinition since it was already defined when the StructureDefinition was initially created
    // keep type since it was already defined when the StructureDefinition was initially created
    structDef.derivation =
      fshDefinition instanceof Logical || fshDefinition instanceof Resource
        ? 'specialization'
        : 'constraint';

    if (fshDefinition instanceof Extension) {
      // Automatically set url.fixedUri on Extensions unless it is already set
      const url = structDef.findElement('Extension.url');
      if (url.fixedUri == null) {
        url.fixedUri = structDef.url;
      }
      // context and contextInvariant only apply to extensions.
      this.setContext(structDef, fshDefinition);
    } else {
      // Should not be defined for non-extensions, but clear just to be sure
      delete structDef.context;
      delete structDef.contextInvariant;
    }

    // Remove all top-level properties that start with _, as the top-level primitive
    // extensions on the parent may not be valid for the child.
    Object.keys(structDef).forEach(key => {
      if (key.startsWith('_')) {
        // @ts-ignore
        delete structDef[key];
      }
    });
  }

  private setContext(structDef: StructureDefinition, fshDefinition: Extension) {
    // Set context to everything by default, but users can override w/ Context keyword or rules, e.g.
    // Context: Observation
    // ^context[0].type = #element
    // ^context[0].expression = "Patient"
    if (fshDefinition.contexts.length > 0) {
      structDef.context = [];
      fshDefinition.contexts.forEach(extContext => {
        if (extContext.isQuoted) {
          structDef.context.push({
            expression: extContext.value,
            type: 'fhirpath'
          });
        } else {
          // this could be the path to an element on some StructureDefinition
          // it could be specified either as a url, a path, or a url with a path
          // url: http://example.org/Some/Url
          // path: resource-name-or-id.some.path
          // url with path: http://example.org/Some/Url#some.path
          // we split on # to make contextItem and contextPath, so if contextPath is not empty, we have a url with a path
          // otherwise, check if contextItem is a url or not. if it is not a url, we have a fsh path that starts with a name or id
          // since # can appear in a url, assume that the last # is what separates the url from the FSH path
          const splitContext = extContext.value.split('#');
          let contextItem: string;
          let contextPath: string;
          if (splitContext.length === 1) {
            contextPath = '';
            contextItem = splitContext[0];
          } else {
            contextPath = splitContext.pop();
            contextItem = splitContext.join('#');
          }

          if (contextPath === '' && !isUri(contextItem)) {
            const splitPath = splitOnPathPeriods(contextItem);
            contextItem = splitPath[0];
            contextPath = splitPath.slice(1).join('.');
          }
          const targetResource = this.fishForFHIR(
            contextItem,
            Type.Extension,
            Type.Profile,
            Type.Resource,
            Type.Logical,
            Type.Type
          );
          if (targetResource != null) {
            const resourceSD = StructureDefinition.fromJSON(targetResource);
            const targetElement = resourceSD.findElementByPath(contextPath, this);
            if (targetElement != null) {
              // we want to represent the context using "extension" type whenever possible.
              // if the resource is an Extension, and every element along the path to the target
              // has type "extension", then this context can be represented with type "extension".
              // otherwise, this is "element" context.
              if (targetElement.isPartOfComplexExtension()) {
                this.setContextForComplexExtension(structDef, targetElement, extContext);
              } else {
                let contextExpression: string;
                let contextType = 'element';
                if (resourceSD.type === 'Extension' && targetElement.parent() == null) {
                  contextExpression = resourceSD.url;
                  contextType = 'extension';
                } else if (
                  resourceSD.derivation === 'specialization' &&
                  resourceSD.url.startsWith('http://hl7.org/fhir/StructureDefinition/')
                ) {
                  contextExpression = targetElement.id;
                } else {
                  contextExpression = `${resourceSD.url}#${targetElement.id}`;
                }
                structDef.context.push({
                  expression: contextExpression,
                  type: contextType
                });
              }
            } else {
              logger.error(
                `Could not find element ${contextPath} on resource ${contextItem} to use as extension context.`,
                extContext.sourceInfo
              );
            }
          } else {
            logger.error(
              `Could not find resource ${contextItem} to use as extension context.`,
              extContext.sourceInfo
            );
          }
        }
      });
    } else if (structDef.context == null) {
      // only set default context if there's no inherited context
      structDef.context = [
        {
          type: 'element',
          expression: 'Element'
        }
      ];
    }
  }

  /**
   * When setting context for a complex extension, the path to the contained extension
   * is based on the urls for each contained extension, like this:
   * extensionUrl#childExtension.grandchildExtension
   * See https://chat.fhir.org/#narrow/stream/179252-IG-creation/topic/Extension.20Contexts/near/361378342
   */
  private setContextForComplexExtension(
    structDef: StructureDefinition,
    targetElement: ElementDefinition,
    extContext: ExtensionContext
  ) {
    const extensionHierarchy = [
      ...targetElement.getAllParents().slice(0, -1).reverse(),
      targetElement
    ]
      .map(ed => {
        const myUrl = ed.structDef.findElement(`${ed.id}.url`);
        if (myUrl?.fixedUri != null) {
          return myUrl.fixedUri;
        } else {
          logger.error(
            `Could not find URL for extension ${ed.id} as part of extension context.`,
            extContext.sourceInfo
          );
          return '';
        }
      })
      .join('.');
    structDef.context.push({
      expression: `${targetElement.structDef.url}#${extensionHierarchy}`,
      type: 'extension'
    });
  }

  private setCharacteristics(structDef: StructureDefinition, fshDefinition: Logical) {
    // characteristics are set using the structuredefinition-type-characteristics extension
    // http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics
    // the allowed codes are in the type-characteristics-code value set.
    // http://hl7.org/fhir/ValueSet/type-characteristics-code
    // the value set is composed of all codes in the type-characteristics-code code system.
    // http://hl7.org/fhir/type-characteristics-code
    // however, the can-be-target code may be missing. if so, use the logical-target extension:
    // http://hl7.org/fhir/tools/StructureDefinition/logical-target
    // see this thread for a discussion of this:
    // https://chat.fhir.org/#narrow/stream/179177-conformance/topic/Reference.20to.20Logical.20Model/near/358606109
    if (this.typeCharacteristicCodes == null) {
      logger.warn(
        `Type characteristics code system not found. Skipping validation of characteristics for ${fshDefinition.name}.`,
        fshDefinition.sourceInfo
      );
    }
    const characteristicExtensions: StructureDefinition['extension'] = [];
    fshDefinition.characteristics.forEach(characteristic => {
      if (this.typeCharacteristicCodes != null) {
        if (this.typeCharacteristicCodes.includes(characteristic)) {
          characteristicExtensions.push({
            url: TYPE_CHARACTERISTICS_EXTENSION,
            valueCode: characteristic
          });
        } else if (characteristic === 'can-be-target') {
          characteristicExtensions.push({
            url: LOGICAL_TARGET_EXTENSION,
            valueBoolean: true
          });
        } else {
          logger.warn(
            `Unrecognized characteristic: ${characteristic}. Supported characteristic codes are ${this.commaSeparatedCharacteristics}.`,
            fshDefinition.sourceInfo
          );
          characteristicExtensions.push({
            url: TYPE_CHARACTERISTICS_EXTENSION,
            valueCode: characteristic
          });
        }
      } else {
        characteristicExtensions.push({
          url: TYPE_CHARACTERISTICS_EXTENSION,
          valueCode: characteristic
        });
      }
    });
    if (characteristicExtensions.length > 0) {
      if (structDef.extension == null) {
        structDef.extension = [];
      }
      structDef.extension.push(...characteristicExtensions);
    }
  }

  /**
   * At this point, 'structDef' contains the parent's ElementDefinitions. For profiles
   * and extensions, these ElementDefinitions are mostly correct, so little processing is
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
    // In some cases, uninherited extensions may be on the root element, so filter them out
    structDef.elements[0].extension = structDef.elements[0].extension?.filter(
      e => !UNINHERITED_EXTENSIONS.includes(e.url)
    );
    if (!structDef.elements[0].extension?.length) {
      // for consistency, delete rather than leaving null-valued
      delete structDef.elements[0].extension;
    }
    structDef.elements[0].modifierExtension = structDef.elements[0].modifierExtension?.filter(
      e => !UNINHERITED_EXTENSIONS.includes(e.url)
    );
    if (!structDef.elements[0].modifierExtension?.length) {
      // for consistency, delete rather than leaving null-valued
      delete structDef.elements[0].modifierExtension;
    }
    structDef.elements[0].captureOriginal();

    // The remaining logic only pertains to logicals and resources, so return here if otherwise
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
    // When we process obeys rules, we may add rules we don't want reflected in preprocessed
    // output, so make a shallow copy of the array and iterate over that instead of the original
    const rules = fshDefinition.rules.slice();
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

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
          const lastIdPart = newElement.id.slice(newElement.id.lastIndexOf('.') + 1);
          // see http://hl7.org/fhir/elementdefinition-definitions.html#ElementDefinition eld-19 and eld-20
          const nameErrors: string[] = [];
          if (!/^[^\s.,:;\\'"\/|?!@#$%&*()\[\]{}]+(\[x\])?$/.test(lastIdPart)) {
            nameErrors.push('cannot include some special characters');
          }
          const trueLength = lastIdPart.endsWith('[x]') ? lastIdPart.length - 3 : lastIdPart.length;
          if (trueLength > 64) {
            nameErrors.push('must be at most 64 characters long');
          }
          if (nameErrors.length > 0) {
            logger.error(
              `Invalid path ${rule.path}. Element names ${nameErrors.join(
                ' and '
              )}. See eld-19 at https://hl7.org/fhir/elementdefinition.html#ElementDefinition-inv.`,
              rule.sourceInfo
            );
          } else if (!/^[A-Za-z][A-Za-z0-9]*(\[x\])?$/.test(lastIdPart)) {
            logger.warn(
              `Inadvisable path ${rule.path}. Element names should be simple alphanumerics. See eld-20 at https://hl7.org/fhir/elementdefinition.html#ElementDefinition-inv.`,
              rule.sourceInfo
            );
          }
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
          if (e.stack) {
            logger.debug(e.stack);
          }
        }
        continue;
      }

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
                if (element.type?.length === 1) {
                  logger.error(
                    `Cannot assign Instance at path ${rule.path} to element of type ${element.type[0].code}. Definition not found for Instance: ${rule.value}.`,
                    rule.sourceInfo
                  );
                } else {
                  logger.error(
                    `Cannot find definition for Instance: ${rule.value}. Skipping rule.`,
                    rule.sourceInfo
                  );
                }
                continue;
              }
              rule.value = instance;
            }
            const replacedRule = replaceReferences(rule, this.tank, this);
            try {
              element.assignValue(replacedRule.value, replacedRule.exactly, this);
            } catch (originalErr) {
              // if an Instance has an id that looks like a number, bigint, or boolean,
              // we may have tried to assign that value instead of an Instance.
              // try to fish up an Instance with the rule's raw value.
              // if we find one, try assigning that instead.
              if (
                originalErr instanceof MismatchedTypeError &&
                ['number', 'bigint', 'boolean'].includes(typeof rule.value)
              ) {
                const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
                const instance = instanceExporter.fishForFHIR(rule.rawValue);
                if (instance == null) {
                  throw originalErr;
                } else {
                  try {
                    element.assignValue(instance, rule.exactly, this);
                    rule.value = instance;
                  } catch (instanceErr) {
                    // if it's still the wrong type, the assignment will fail.
                    // but, we want to log that error with the original type, not the instance type.
                    if (instanceErr instanceof MismatchedTypeError) {
                      throw originalErr;
                    } else {
                      throw instanceErr;
                    }
                  }
                }
              } else {
                throw originalErr;
              }
            }
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
            const vsMetadata = this.fishForMetadata(rule.valueSet, Type.ValueSet);
            const vsURI = rule.valueSet.replace(/^([^|]+)/, vsMetadata?.url ?? '$1');
            const csURI = this.fishForMetadata(rule.valueSet, Type.CodeSystem)?.url;
            if (csURI && !isUri(vsURI)) {
              throw new MismatchedBindingTypeError(rule.valueSet, rule.path, 'ValueSet');
            }
            element.bindToVS(
              vsURI,
              rule.strength as ElementDefinitionBindingStrength,
              rule.sourceInfo
            );
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
                  if (e.stack) {
                    logger.debug(e.stack);
                  }
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
                  this.deferredRules.get(structDef).push({ rule: replacedRule });
                } else {
                  this.deferredRules.set(structDef, [{ rule: replacedRule }]);
                }
              } else {
                try {
                  structDef.setInstancePropertyByPath(
                    replacedRule.caretPath,
                    replacedRule.value,
                    this
                  );
                } catch (originalErr) {
                  if (
                    originalErr instanceof MismatchedTypeError &&
                    ['number', 'bigint', 'boolean'].includes(typeof rule.value)
                  ) {
                    // retry like with an assignment rule,
                    // but we have to defer it.
                    if (this.deferredRules.has(structDef)) {
                      this.deferredRules.get(structDef).push({ rule: replacedRule, originalErr });
                    } else {
                      this.deferredRules.set(structDef, [{ rule: replacedRule, originalErr }]);
                    }
                  } else {
                    throw originalErr;
                  }
                }
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
              // First apply the standard metadata from the keywords
              const cstIdx = element.applyConstraint(invariant, structDef.url);
              if (!idRegex.test(invariant.name)) {
                throw new InvalidFHIRIdError(invariant.name);
              }
              // Invariant rules are just assignments on the constraint paths in the StructureDefinition.
              // As such, the most robust way to handle them (and anything an author might try to do)
              // is to convert them all to caret rules and insert them in the rules to be processed.
              if (invariant.rules.length) {
                const constraintCaretRules = invariant.rules
                  .filter(invRule => invRule instanceof AssignmentRule)
                  .map((invRule: AssignmentRule) => {
                    // Top-level obeys rule (no path) actually applies to root element (.)
                    const caretRule = new CaretValueRule(rule.path === '' ? '.' : rule.path)
                      .withFile(invRule.sourceInfo.file)
                      .withLocation(invRule.sourceInfo.location)
                      .withAppliedFile(rule.sourceInfo.file)
                      .withAppliedLocation(rule.sourceInfo.location);
                    caretRule.caretPath = `constraint[${cstIdx}].${invRule.path}`;
                    caretRule.value = invRule.value;
                    caretRule.rawValue = invRule.rawValue;
                    caretRule.isInstance = invRule.isInstance;
                    return caretRule;
                  });
                resolveSoftIndexing(constraintCaretRules);
                rules.splice(i + 1, 0, ...constraintCaretRules);
              }
            }
          }
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
          if (e.stack) {
            logger.debug(e.stack);
          }
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
      for (const { rule, originalErr } of rules) {
        let fishItem: string;
        if (typeof rule.value === 'string') {
          fishItem = rule.value;
        } else if (['number', 'bigint', 'boolean'].includes(typeof rule.value)) {
          fishItem = rule.rawValue;
        }

        const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
        let fishedValue = instanceExporter.fishForFHIR(fishItem);
        if (fishedValue == null) {
          const result = this.fishForFHIR(fishItem);
          if (!(result instanceof InstanceDefinition) && result instanceof Object) {
            fishedValue = InstanceDefinition.fromJSON(fishedValue);
          }
        }

        if (fishedValue instanceof InstanceDefinition) {
          try {
            sd.setInstancePropertyByPath(rule.caretPath, fishedValue, this);
          } catch (e) {
            if (e instanceof MismatchedTypeError && originalErr != null) {
              logger.error(originalErr.message, rule.sourceInfo);
              if (originalErr.stack) {
                logger.debug(originalErr.stack);
              }
            } else {
              logger.error(e.message, rule.sourceInfo);
              if (e.stack) {
                logger.debug(e.stack);
              }
            }
          }
        } else {
          if (originalErr != null) {
            logger.error(originalErr.message, rule.sourceInfo);
            if (originalErr.stack) {
              logger.debug(originalErr.stack);
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
        // there might be a |version appended to the type, so try to use the version but fall back
        // to any version if necessary
        const extension = fishForFHIRBestVersion(this, item.type, rule.sourceInfo, Type.Extension);
        if (extension == null) {
          logger.error(
            `Cannot create ${item.name} extension; unable to locate extension definition for: ${item.type}.`,
            rule.sourceInfo
          );
          return;
        }
        try {
          const profileUrl = item.type.replace(/^[^|]+/, extension.url);
          const slice = element.addSlice(item.name);
          if (!slice.type[0].profile) {
            slice.type[0].profile = [];
          }
          slice.type[0].profile.push(profileUrl);
        } catch (e) {
          // If this is a DuplicateSliceError, and it references the same extension definition,
          // then it is most likely a harmless no-op.  In this case, treat it as a warning.
          if (e instanceof DuplicateSliceError) {
            const slice = element.getSlices().find(el => el.sliceName === item.name);
            if (slice?.type[0]?.profile?.some(p => p === extension.url)) {
              logger.warn(e.message, rule.sourceInfo);
              if (e.stack) {
                logger.debug(e.stack);
              }
              return;
            }
          }
          // Otherwise it is a conflicting duplicate extension or some other error
          logger.error(e.message, rule.sourceInfo);
          if (e.stack) {
            logger.debug(e.stack);
          }
        }
        // check if we have used modifier extensions correctly
        const isModifier = isModifierExtension(extension);
        const isModifierPath = element.path.endsWith('.modifierExtension');
        if (isModifier && !isModifierPath) {
          logger.error(
            `Modifier extension ${item.type} assigned to extension path. Modifier extensions should only be assigned to modifierExtension paths.`,
            rule.sourceInfo
          );
        } else if (!isModifier && isModifierPath) {
          logger.error(
            `Non-modifier extension ${item.type} assigned to modifierExtension path. Non-modifier extensions should only be assigned to extension paths.`,
            rule.sourceInfo
          );
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
          if (e.stack) {
            logger.debug(e.stack);
          }
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
      ) as Profile | Extension | Logical | Resource | Instance;
      if (
        fshDefinition instanceof Profile ||
        fshDefinition instanceof Extension ||
        fshDefinition instanceof Logical ||
        fshDefinition instanceof Resource
      ) {
        this.exportStructDef(fshDefinition);
        result = this.fisher.fishForFHIR(item, ...types);
      } else if (fshDefinition instanceof Instance) {
        const instanceExporter = new InstanceExporter(this.tank, this.pkg, this.fisher);
        instanceExporter.exportInstance(fshDefinition);
        result = this.fisher.fishForFHIR(item, ...types);
      }
    }
    return result;
  }

  fishForMetadata(item: string, ...types: Type[]): Metadata {
    // If it's in the tank, it can get the metadata from there (no need to export like in fishForFHIR)
    return this.fisher.fishForMetadata(item, ...types);
  }

  applyInsertRules(): void {
    const invariants = this.tank.getAllInvariants();
    for (const inv of invariants) {
      applyInsertRules(inv, this.tank);
    }
    const structureDefinitions = this.tank.getAllStructureDefinitions();
    for (const sd of structureDefinitions) {
      applyInsertRules(sd, this.tank);
    }
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

    this.preprocessStructureDefinition(fshDefinition, structDef.type === 'Extension');

    this.setRules(structDef, fshDefinition);

    // The recursive structDef fields on elements should be ignored to avoid infinite looping
    // And, the _sliceName and _primitive properties added by SUSHI should be skipped.
    cleanResource(structDef, (prop: string) =>
      ['structDef', '_sliceName', '_primitive'].includes(prop)
    );
    structDef.inProgress = false;

    structDef.validate().forEach(err => {
      logger.log(err.severity, err.message, fshDefinition.sourceInfo);
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
   * Checks invariants to ensure they have the required values (human and severity) and that
   * the values are appropriate. In order to avoid excessive logging, this is done once, as a group,
   * rather than each time an invariant is applied
   */
  private checkInvariants(): void {
    const invariants = this.tank.getAllInvariants();
    invariants.forEach(invariant => {
      const descriptionRule = findLast(
        invariant.rules,
        r => r instanceof AssignmentRule && r.path === 'human'
      ) as AssignmentRule;
      const description = descriptionRule?.value ?? invariant.description;
      if (description == null) {
        logger.error(
          `Invariant ${invariant.name} is missing its human description. To set the description, add the "Description:" keyword or add a rule assigning "human" to a string value.`,
          invariant.sourceInfo
        );
      }
      const severityRule = findLast(
        invariant.rules,
        r => r instanceof AssignmentRule && r.path === 'severity'
      ) as AssignmentRule;
      const severity = severityRule?.value ?? invariant.severity;
      if (severity == null) {
        logger.error(
          `Invariant ${invariant.name} is missing its severity level. To set the severity, add the "Severity:" keyword or add a rule assigning "severity" to #error or #warning.`,
          invariant.sourceInfo
        );
      } else if (!(severity instanceof FshCode && ['error', 'warning'].includes(severity.code))) {
        logger.error(
          `Invariant ${invariant.name} has an invalid severity level. Supported values are #error and #warning.`,
          (severity instanceof FshEntity && severity.sourceInfo) ??
            severityRule.sourceInfo ??
            invariant.sourceInfo
        );
      } else if (severity.system != null) {
        logger.warn(
          `Invariant ${invariant.name} has a severity level including a code system. Remove the code system from the value.`,
          (severity instanceof FshEntity && severity.sourceInfo) ??
            severityRule.sourceInfo ??
            invariant.sourceInfo
        );
      }
    });
  }

  /**
   * Exports Profiles, Extensions, Logical models, and Resources to StructureDefinitions
   * @returns {Package}
   */
  export(): Package {
    this.checkInvariants();
    const structureDefinitions = this.tank.getAllStructureDefinitions();
    structureDefinitions.forEach(sd => {
      try {
        this.exportStructDef(sd);
      } catch (e) {
        logger.error(e.message, e.sourceInfo || sd.sourceInfo);
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    });
    this.warnOnNonConformantResourceDefinitions();
    if (structureDefinitions.length > 0) {
      logger.info(`Converted ${structureDefinitions.length} FHIR StructureDefinitions.`);
    }
    return this.pkg;
  }
}
