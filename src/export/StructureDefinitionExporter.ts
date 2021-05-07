import { cloneDeep, isEmpty } from 'lodash';
import {
  ElementDefinition,
  ElementDefinitionBindingStrength,
  idRegex,
  InstanceDefinition,
  PathPart,
  StructureDefinition
} from '../fhirtypes';
import { Extension, Invariant, isAllowedRule, Logical, Profile, Resource } from '../fshtypes';
import { FSHTank } from '../import';
import { InstanceExporter } from '../export';
import {
  DuplicateSliceError,
  InvalidExtensionParentError,
  InvalidLogicalParentError,
  InvalidProfileParentError,
  InvalidResourceParentError,
  InvalidFHIRIdError,
  ParentDeclaredAsNameError,
  ParentDeclaredAsIdError,
  ParentNotDefinedError,
  ParentNotProvidedError
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
  OnlyRule,
  SdRule
} from '../fshtypes/rules';
import {
  assembleFSHPath,
  Fishable,
  logger,
  MasterFisher,
  Metadata,
  parseFSHPath,
  resolveSoftIndexing,
  Type
} from '../utils';
import {
  applyInsertRules,
  applyMixinRules,
  cleanResource,
  getUrlFromFshDefinition,
  replaceReferences,
  splitOnPathPeriods
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
 * The StructureDefinitionExporter is the class for exporting Logical models, Profiles, and Extensions.
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
    // Process/validate the fshDefinition.parent value with the purpose of
    // obtaining the parent's StructureDefinition as the basis for this
    // fshDefinition's StructureDefinition.
    // RECALL: fshDefinition.parent can be specified as the 'id', 'name', or 'url'.

    if (isEmpty(fshDefinition.parent)) {
      // Handle cases where the parent is not specified by throwing an error.
      // - Profile has a hard requirement to define a parent and does not have a default
      //   parent defined in the Profile class. Therefore, we need to throw this error.
      // - Extension, Logical, and Resource all have a default parent, so we should never
      //   get to this point where it is not defined. That said, if something somewhere
      //   in the code were to change/remove the default, this error will then be thrown.
      throw new ParentNotProvidedError(fshDefinition.name, fshDefinition.sourceInfo);
    }

    let defnType: Type;
    if (fshDefinition instanceof Extension) {
      defnType = Type.Extension;
    } else if (fshDefinition instanceof Logical) {
      defnType = Type.Logical;
    } else {
      defnType = Type.Resource;
    }

    if (fshDefinition.name === fshDefinition.parent) {
      const result = this.fishForMetadata(fshDefinition.parent, defnType);
      throw new ParentDeclaredAsNameError(
        fshDefinition.constructorName,
        fshDefinition.name,
        fshDefinition.sourceInfo,
        result?.url
      );
    }

    if (fshDefinition.id === fshDefinition.parent) {
      const result = this.fishForMetadata(fshDefinition.parent, defnType);
      throw new ParentDeclaredAsIdError(
        fshDefinition.constructorName,
        fshDefinition.name,
        fshDefinition.id,
        fshDefinition.sourceInfo,
        result?.url
      );
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
      parentJson = this.createR4BaseStructureDefinition();
    }
    if (!parentJson) {
      // If parentJson is not defined, then the provided parent's StructureDefinition is not defined
      throw new ParentNotDefinedError(
        fshDefinition.name,
        fshDefinition.parent,
        fshDefinition.sourceInfo
      );
    }

    if (fshDefinition instanceof Profile && parentJson.kind === 'logical') {
      // A profile cannot have a logical model as a parent
      throw new InvalidProfileParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    } else if (fshDefinition instanceof Extension && parentJson.type !== 'Extension') {
      // An extension can only have an Extension as a parent
      throw new InvalidExtensionParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    } else if (
      fshDefinition instanceof Logical &&
      !(
        (['logical', 'resource'].includes(parentJson.kind) &&
          parentJson.derivation === 'specialization') ||
        parentJson.type === 'Base' ||
        parentJson.type === 'Element'
      )
    ) {
      // A logical model can only have another logical model as a parent
      // or it can have the Base or Element resource as a parent
      throw new InvalidLogicalParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    } else if (
      fshDefinition instanceof Resource &&
      !(parentJson.type === 'Resource' || parentJson.type === 'DomainResource')
    ) {
      // A resource can only have the 'Resource' or 'DomainResource' as a parent
      throw new InvalidResourceParentError(
        fshDefinition.name,
        parentJson.name,
        fshDefinition.sourceInfo
      );
    }

    return StructureDefinition.fromJSON(parentJson);
  }

  /**
   * Creates a 'Base' StructureDefinition for use by R4 logical models.
   *
   * In FHIR R5, the 'Base' type has been defined as the type that all other
   * FHIR types specialize, in particular 'Element' and 'Resource'. In addition,
   * 'Base' is used in Logical Models that don't have or want id/extension.
   * The 'Base' type does not exist in FHIR R4, so we need to "create" it.
   * Since we are only using this 'Base' as the initial StructureDefinition
   * that gets modified to become the exported StructureDefinition for logical
   * models, "creating" a R4 'Base' should not be a problem.
   *
   * NOTE: The R5 Base StructureDefinition version 4.6.0 as of 2021-04-15
   *       is being used to create our version. The following changes were made:
   *       - Set both "fhirVersion" and "version" to '4.0.1'
   *       - Removed following from root element:
   *         - "definition"
   *         - "extension"
   *         - "mapping"
   *         - "short"
   * @see http://build.fhir.org/types.html#Base
   * @private
   */
  private createR4BaseStructureDefinition(): string {
    const base = `
{
  "abstract": true,
  "contact": [{
      "telecom": [{
          "system": "url",
          "value": "http://hl7.org/fhir"
        }
      ]
    }
  ],
  "date": "2021-04-15T12:25:09+10:00",
  "description": "Base StructureDefinition for Base Type: Base definition for all types defined in FHIR type system.",
  "differential": {
    "element": [{
        "id": "Base",
        "max": "*",
        "min": 0,
        "path": "Base"
      }
    ]
  },
  "extension": [{
      "url": "http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status",
      "valueCode": "normative"
    }, {
      "url": "http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version",
      "valueCode": "4.0.0"
    }
  ],
  "fhirVersion": "4.0.1",
  "id": "Base",
  "kind": "complex-type",
  "mapping": [{
      "identity": "rim",
      "name": "RIM Mapping",
      "uri": "http://hl7.org/v3"
    }
  ],
  "name": "Base",
  "publisher": "HL7 FHIR Standard",
  "resourceType": "StructureDefinition",
  "snapshot": {
    "element": [{
        "base": {
          "max": "*",
          "min": 0,
          "path": "Base"
        },
        "constraint": [{
            "expression": "hasValue() or (children().count() > id.count())",
            "human": "All FHIR elements must have a @value or children",
            "key": "ele-1",
            "severity": "error",
            "source": "http://hl7.org/fhir/StructureDefinition/Element",
            "xpath": "@value|f:*|h:div"
          }
        ],
        "id": "Base",
        "isModifier": false,
        "max": "*",
        "min": 0,
        "path": "Base"
      }
    ]
  },
  "status": "active",
  "text": {
    "div": "<div xmlns=\\"http://www.w3.org/1999/xhtml\\"><table border=\\"0\\" cellpadding=\\"0\\" cellspacing=\\"0\\" style=\\"border: 0px #F0F0F0 solid; font-size: 11px; font-family: verdana; vertical-align: top;\\"><tr style=\\"border: 1px #F0F0F0 solid; font-size: 11px; font-family: verdana; vertical-align: top\\"><th style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"><a href=\\"formats.html#table\\" title=\\"The logical name of the element\\">Name</a></th><th style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"><a href=\\"formats.html#table\\" title=\\"Information about the use of the element\\">Flags</a></th><th style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"><a href=\\"formats.html#table\\" title=\\"Minimum and Maximum # of times the the element can appear in the instance\\">Card.</a></th><th style=\\"width: 100px\\" class=\\"hierarchy\\"><a href=\\"formats.html#table\\" title=\\"Reference to the type of the element\\">Type</a></th><th style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"><a href=\\"formats.html#table\\" title=\\"Additional information about the element\\">Description &amp; Constraints</a><span style=\\"float: right\\"><a href=\\"formats.html#table\\" title=\\"Legend for this format\\"><img src=\\"help16.png\\" alt=\\"doco\\" style=\\"background-color: inherit\\"/></a></span></th></tr><tr style=\\"border: 0px #F0F0F0 solid; padding:0px; vertical-align: top; background-color: white\\"><td style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px; white-space: nowrap; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAACCAYAAACg/LjIAAAAJUlEQVR4Xu3IIQEAAAgDsHd9/w4EQIOamFnaBgAA4MMKAACAKwNp30CqZFfFmwAAAABJRU5ErkJggg==)\\" class=\\"hierarchy\\"><img src=\\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAWCAYAAAABxvaqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wYeFzIs1vtcMQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAE0lEQVQI12P4//8/AxMDAwNdCABMPwMo2ctnoQAAAABJRU5ErkJggg==\\" alt=\\".\\" style=\\"background-color: inherit\\" class=\\"hierarchy\\"/><img src=\\"data:image/png;base64,R0lGODlhEAAQAMQfAGm6/idTd4yTmF+v8Xa37KvW+lyh3KHJ62aq41ee2bXZ98nm/2mt5W2Ck5XN/C1chEZieho8WXXA/2Gn4P39/W+y6V+l3qjP8Njt/lx2izxPYGyv51Oa1EJWZ////////yH5BAEAAB8ALAAAAAAQABAAAAWH4Cd+Xml6Y0pCQts0EKp6GbYshaM/skhjhCChUmFIeL4OsHIxXRAISQTl6SgIG8+FgfBMoh2qtbLZQr0TQJhk3TC4pYPBApiyFVDEwSOf18UFXxMWBoUJBn9sDgmDewcJCRyJJBoEkRyYmAABPZQEAAOhA5seFDMaDw8BAQ9TpiokJyWwtLUhADs=\\" alt=\\".\\" style=\\"background-color: white; background-color: inherit\\" title=\\"Choice of Types\\" class=\\"hierarchy\\"/> <a href=\\"types-definitions.html#Base\\" title=\\"Base : Base definition for all types defined in FHIR type system.\\">Base</a></td><td style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"><a style=\\"padding-left: 3px; padding-right: 3px; color: black; null\\" href=\\"uml.html#interface\\" title=\\"This is an interface resource\\">«I»</a><a style=\\"padding-left: 3px; padding-right: 3px; border: 1px grey solid; font-weight: bold; color: black; background-color: #e6ffe6\\" href=\\"versions.html#std-process\\" title=\\"Standards Status = Normative\\">N</a></td><td style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"></td><td style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\"></td><td style=\\"vertical-align: top; text-align : left; background-color: white; border: 0px #F0F0F0 solid; padding:0px 4px 0px 4px\\" class=\\"hierarchy\\">Base for all types and resources</td></tr>\\r\\n<tr><td colspan=\\"5\\" class=\\"hierarchy\\"><br/><a href=\\"formats.html#table\\" title=\\"Legend for this format\\"><img src=\\"help16.png\\" alt=\\"doco\\" style=\\"background-color: inherit\\"/> Documentation for this format</a></td></tr></table></div>",
    "status": "generated"
  },
  "type": "Base",
  "url": "http://hl7.org/fhir/StructureDefinition/Base",
  "version": "4.0.1"
}`;
    return JSON.parse(base);
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
    // keep kind since it should not change except for logical models
    if (fshDefinition instanceof Logical) {
      structDef.kind = 'logical';
    }
    structDef.abstract = false; // always reset to false, assuming most children of abstracts aren't abstract; can be overridden w/ rule
    structDef.baseDefinition = baseURL;
    if (fshDefinition instanceof Logical || fshDefinition instanceof Resource) {
      // By definition, the 'type' is the same as the 'id'
      structDef.type = fshDefinition.id;
      structDef.derivation = 'specialization';
    } else {
      // keep type since this should not change except for logical models or resources
      // always constraint for profiles/extensions
      structDef.derivation = 'constraint';
    }

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
   *
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

    const elements = cloneDeep(structDef.elements);

    // The Elements will have the same values for both 'id' and 'path'.
    // Therefore, use the 'id' as the source of the conversion and reset
    // the 'id' value with the new base value. The 'id' mutator will
    // automatically reset the 'path' value'.
    elements.forEach(e => {
      const pathParts: PathPart[] = parseFSHPath(e.id);
      pathParts[0].base = fshDefinition.id;
      e.id = assembleFSHPath(pathParts);
    });

    // The root element's base.path should be the same as root element's path
    elements[0].base.path = elements[0].path;
    // Reset the root element's short and definition
    if (fshDefinition.title) {
      elements[0].short = fshDefinition.title;
    }
    if (fshDefinition.description) {
      elements[0].definition = fshDefinition.description;
    }

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
    // Still need the root element so clear its _original
    structDef.elements[0].clearOriginal();

    // Update each element's copy of structDef
    structDef.elements.forEach(e => {
      e.structDef = structDef;
    });
  }

  /**
   * Applies the AddElementRules to add the new elements to the structDef. These rules must
   * be applied early in the processing to ensure all elements are defined before other rules
   * can be processed since other rules can apply to the newly created elements.
   *
   * @param {StructureDefinition} structDef - The StructureDefinition to set metadata on
   * @param {Profile | Extension | Logical | Resource} fshDefinition - The definition we are exporting
   * @private
   */
  private applyAddElementRules(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension | Logical | Resource
  ): void {
    if (fshDefinition instanceof Profile || fshDefinition instanceof Extension) {
      // AddElement rules can only be applied to logical models and custom resources
      return;
    }
    const addElementRules = fshDefinition.rules.filter(
      rule => rule.constructorName === 'AddElementRule'
    ) as AddElementRule[];

    for (const rule of addElementRules) {
      try {
        // Note: newElement() method automatically adds the new element to its structDef.elements
        const newElement = structDef.newElement(rule.path);
        newElement.applyAddElementRule(rule, this);
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    }
  }

  /**
   * Sets the SD Rules rules for the StructureDefinition
   * @param {StructureDefinition} structDef - The StructureDefinition to set rules on
   * @param {Profile | Extension | Logical | Resource} fshDefinition - The definition we are exporting
   * @private
   */
  private setSdRules(
    structDef: StructureDefinition,
    fshDefinition: Profile | Extension | Logical | Resource
  ): void {
    resolveSoftIndexing(fshDefinition.rules);

    // The AddElementRules have already been processed so structDef.elements
    // already contains the newly added elements; therefore, remove the
    // AddElementRules from all other SD rules. This allows us to process all
    // of the SD rules on all elements, including the newly created elements.
    const sdRules = fshDefinition.rules.filter(
      rule => rule.constructorName !== 'AddElementRule'
    ) as SdRule[];

    for (const rule of sdRules) {
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

      const element = structDef.findElementByPath(rule.path, this);

      if (element && (fshDefinition instanceof Logical || fshDefinition instanceof Resource)) {
        // The FHIR spec prohibits constraining any parent element in a 'specialization'
        // (i.e., logical model and resource), therefore log an error if that is attempted
        // and continue to the next rule.
        if (element.path !== element.base.path) {
          // The AddElementRule always sets the element.base.path to the value of element.path.
          // All parent elements will have the element.base.path pointing to the parent
          logger.error(
            `FHIR prohibits constraining parent elements. Skipping '${rule.constructorName}' at path '${rule.path}' for '${fshDefinition.name}'.`,
            rule.sourceInfo
          );
          continue;
        }
      }

      // CaretValueRules apply to both StructureDefinitions and ElementDefinitions; therefore,
      // rule handling for CaretValueRules must be outside the 'if (element) {...}' code block.
      if (rule instanceof CaretValueRule) {
        try {
          const replacedRule = replaceReferences(rule, this.tank, this);
          if (replacedRule.path !== '') {
            if (element) {
              element.setInstancePropertyByPath(replacedRule.caretPath, replacedRule.value, this);
            } else {
              logger.error(
                `No element found at path '${rule.path}' for '${fshDefinition.name}', skipping element-based CaretValueRule`,
                rule.sourceInfo
              );
            }
          } else {
            if (replacedRule.isInstance) {
              if (this.deferredRules.has(structDef)) {
                this.deferredRules.get(structDef).push(replacedRule);
              } else {
                this.deferredRules.set(structDef, [replacedRule]);
              }
            } else {
              structDef.setInstancePropertyByPath(replacedRule.caretPath, replacedRule.value, this);
            }
          }
        } catch (e) {
          logger.error(e.message, rule.sourceInfo);
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
                try {
                  element.addSlice(item.name);
                } catch (e) {
                  logger.error(e.message, rule.sourceInfo);
                }
              });
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
   * @param {Profile | Extension | Logical} fshDefinition - the FSH Definition the rule is on
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
   * Does any necessary preprocessing of profiles, extensions, and logical models.
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
    // Reset the parent's 'structDef.elements' as required.
    this.resetParentElements(structDef, fshDefinition);
    // Reset the original parent's metadata to that for the new StructureDefinition
    this.setMetadata(structDef, fshDefinition);

    // These are being pushed now in order to allow for
    // incomplete definitions to be used to resolve circular reference issues.
    if (structDef.type === 'Extension') {
      this.pkg.extensions.push(structDef);
    } else if (structDef.kind === 'logical') {
      this.pkg.logicals.push(structDef);
    } else if (structDef.kind === 'resource' && structDef.derivation === 'specialization') {
      this.pkg.resources.push(structDef);
    } else {
      this.pkg.profiles.push(structDef);
    }

    if (fshDefinition instanceof Profile || fshDefinition instanceof Extension) {
      // mixins are deprecated and are only supported in profiles and extensions
      applyMixinRules(fshDefinition, this.tank);
    }
    // fshDefinition.rules may include insert rules, which must be expanded before applying other rules
    applyInsertRules(fshDefinition, this.tank);
    // Apply the AddElementRules to create the new elements before any other processing
    this.applyAddElementRules(structDef, fshDefinition);

    this.preprocessStructureDefinition(fshDefinition, structDef.type === 'Extension');

    this.setSdRules(structDef, fshDefinition);

    // The elements list does not need to be cleaned up.
    // And, the _sliceName and _primitive properties added by SUSHI should be skipped.
    cleanResource(structDef, (prop: string) =>
      ['elements', '_sliceName', '_primitive'].includes(prop)
    );
    structDef.inProgress = false;

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
    if (structureDefinitions.length > 0) {
      logger.info(`Converted ${structureDefinitions.length} FHIR StructureDefinitions.`);
    }
    return this.pkg;
  }
}
