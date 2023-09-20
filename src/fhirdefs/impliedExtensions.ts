// This file contains logic to support "implied" extensions, which are a special type of extension
// that allows IG authors to refer to elements from past or future versions of FHIR. For example,
// an R4 Patient profile could use an implied extension to bring in the STU3 Patient.animal.species
// element.  Implied extensions are described in the FHIR spec here:
// http://hl7.org/fhir/versions.html#extensions
//
// The basic implementation approach is as follows:
// - Authors indicate they need to use implied extensions by adding one of the special packages
//   described in the FHIR documentation (e.g., hl7.fhir.extensions.r2#4.0.1)
//   - The package name (e.g., hl7.fhir.extensions.r2) indicates the version of FHIR that has the
//     element the author needs to reference from the extension.
//   - The package version (e.g., 4.0.1) indicates the fhir version of the IG using the extension.
// - The special extension packages do not actually exist as retrievable packages. SUSHI does not
//   attempt to download the package, but rather uses it as a hint to download the core FHIR
//   package for the corresponding FHIR version.
//   - The corresponding core FHIR package is stored as a "supplemental" FHIR package in
//     FHIRDefinitions and only used when processing "implied" extensions.
// - When SUSHI code "fishes" for an implied extension, SUSHI "materializes" the extension (i.e.,
//   builds an extension representation on the fly) using the path from the extension URL and
//   the corresponding StructureDefinition of the referenced type from the "supplemental" FHIR
//   package.
//   - e.g., http://hl7.org/fhir/3.0/StructureDefinition/extension-Patient.animal.species would
//     be built using the FHIR STU3 Patient StructureDefinition's Patient.animal.species element.
//   - Rules for representation as a simple or complex extension are defined in the FHIR
//     documentation (and were clarified through Zulip conversations).
// - Once the extension has been "fished", it's used like any other extension.

import { union } from 'lodash';
import { logger, Type } from '../utils';
import { ElementDefinition, ElementDefinitionType, StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';

export const IMPLIED_EXTENSION_REGEX =
  /^http:\/\/hl7\.org\/fhir\/([1345]\.0)\/StructureDefinition\/extension-(([^./]+)\..+)$/;

// This map represents the relationship from the version part of the extension URL to the FHIR package
const VERSION_TO_PACKAGE_MAP: { [key: string]: string } = {
  '1.0': 'hl7.fhir.r2.core#1.0.2',
  '3.0': 'hl7.fhir.r3.core#3.0.2',
  '4.0': 'hl7.fhir.r4.core#4.0.1',
  '5.0': 'hl7.fhir.r5.core#5.0.0'
};

// This map represents how old resource types (R2/R3) map to R4/R5 or how new resource types (R5) map to R4.
// This is only used for references, otherwise a complex extension representing the resource should be used
// instead. We need this for references because there is no way to point a reference at an extension.
// For conversation on this, see: https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/Use.205.2E0.20Extension/near/232846364
// TODO: Redo when implied extension behavior is clarified in R5 and to confirm R5-based mappings are still correct.
const RESOURCE_TO_RESOURCE_MAP: { [key: string]: string } = {
  // Mappings R2 -> R4/R5
  BodySite: 'BodyStructure',
  Conformance: 'CapabilityStatement',
  DeviceComponent: 'DeviceDefinition',
  DeviceUseRequest: 'DeviceRequest',
  DiagnosticOrder: 'ServiceRequest',
  EligibilityRequest: 'CoverageEligibilityRequest',
  EligibilityResponse: 'CoverageEligibilityResponse',
  MedicationOrder: 'MedicationRequest',
  ProcedureRequest: 'ServiceRequest',
  ReferralRequest: 'ServiceRequest',
  // Mappings R3 -> R4/R5 (no new mappings, already covered by R2 -> R4/R5)
  // Mappings R4 -> R5
  DeviceUseStatement: 'DeviceUsage',
  MedicationStatement: 'MedicationUsage',
  MedicinalProduct: 'MedicinalProductDefinition',
  MedicinalProductAuthorization: 'RegulatedAuthorization',
  MedicinalProductContraindication: 'ClinicalUseIssue',
  MedicinalProductIndication: 'ClinicalUseIssue',
  MedicinalProductIngredient: 'Ingredient',
  MedicinalProductInteraction: 'ClinicalUseIssue',
  MedicinalProductManufactured: 'ManufacturedItemDefinition',
  MedicinalProductPackaged: 'PackagedProductDefinition',
  MedicinalProductPharmaceutical: 'AdministrableProductDefinition',
  MedicinalProductUndesirableEffect: 'ClinicalUseIssue',
  SubstanceSpecification: 'SubstanceDefinition',
  // Mappings R5 -> R4
  AdministrableProductDefinition: 'MedicinalProductPharmaceutical',
  CapabilityStatement2: 'CapabilityStatement',
  DeviceUsage: 'DeviceUseStatement',
  Ingredient: 'MedicinalProductIngredient',
  ManufacturedItemDefinition: 'MedicinalProductManufactured',
  MedicationUsage: 'MedicationUseStatement',
  MedicinalProductDefinition: 'MedicinalProduct',
  PackagedProductDefinition: 'MedicinalProductPackaged',
  RegulatedAuthorization: 'MedicinalProductAuthorization',
  SubstanceDefinition: 'SubstanceSpecification'
};

// It's sad to ignore any child, but really, we don't care about these particular
// children of the original element when building complex extensions.  Sorry kids!
const IGNORED_CHILDREN = ['id', 'extension', 'modifierExtension'];

/**
 * Determines if the passed in URL is an implied extension URL by checking if it follows the
 * format: http://hl7.org/fhir/[version]/StructureDefinition/extension-[Path]
 * @param url {string} - the extension URL to test
 * @returns {boolean} true if the extension is an implied extension; false otherwise.
 */
export function isImpliedExtension(url: string): boolean {
  return IMPLIED_EXTENSION_REGEX.test(url);
}

/**
 * Given an extension URL and FHIRDefinitions, materializeImpliedExtension will extract the FHIR
 * version and element path from the URL and generate a StructureDefinition representing the
 * requested extension. This is necessary because implied extensions do not exist in physical
 * packages; they must be "materialized" on-the-fly. For an overview of the general approach, see
 * the comments at the top of this file.
 * @param url {string} - the URL of the extension to materialize
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitons object for the current project
 * @returns {any} a JSON StructureDefinition representing the implied extension
 */
export function materializeImpliedExtension(url: string, defs: FHIRDefinitions): any {
  const match = url.match(IMPLIED_EXTENSION_REGEX);
  if (match == null) {
    logger.error(
      `Unsupported extension URL: ${url}. Extension URLs for converting between versions of ` +
        'FHIR must follow the pattern http://hl7.org/fhir/[version]/StructureDefinition/extension-[Path]. ' +
        'See: http://hl7.org/fhir/versions.html#extensions.'
    );
    return;
  }

  const [, version, id, type] = match;
  const supplementalPackage = VERSION_TO_PACKAGE_MAP[version]; // guaranteed not to be null thanks to REGEX check above
  const supplementalDefs = defs.getSupplementalFHIRDefinitions(supplementalPackage);
  if (supplementalDefs == null) {
    const extRelease = version === '1.0' ? 'r2' : `r${version[0]}`;
    const fhirVersion = defs.fishForFHIR('StructureDefinition', Type.Resource)?.fhirVersion;
    logger.error(
      `The extension ${url} requires the following dependency to be declared in your sushi-config.yaml ` +
        `file:\n  hl7.fhir.extensions.${extRelease}: ${fhirVersion}`
    );
    return;
  }

  const sd = supplementalDefs.fishForFHIR(type, Type.Resource, Type.Type);
  if (sd == null) {
    logger.error(
      `Cannot process extension (${url}) since ${type} is not a valid resource or ` +
        `data type in ${supplementalPackage}.`
    );
    return;
  }

  // NOTE: DSTU2 definitions don't populate element id, so fallback to path in that case
  const ed = sd.snapshot.element.find((ed: any) => (ed.id ?? ed.path) === id);
  if (ed == null) {
    logger.error(`Cannot process extension (${url}) since ${id} is not a valid id in ${type}.`);
    return;
  } else if (isUnsupported(ed)) {
    logger.error(
      `Cannot process extension (${url}) since its type is Resource. ` +
        'See: http://hl7.org/fhir/versions.html#extensions.'
    );
    return;
  }

  const ext = StructureDefinition.fromJSON(defs.fishForFHIR('Extension'));
  applyMetadataToExtension(sd, ed, version, ext);
  const rootElement = ext.findElement('Extension');
  applyMetadataToElement(ed, rootElement);
  applyContent(sd, ed, version, ext, rootElement, [], defs, supplementalDefs);

  return ext.toJSON(true);
}

/**
 * Determines if the ElementDefinition can be represented using an implied extension. According to
 * the FHIR documentation, elements with type "Resource" cannot be represented as implied
 * extensions.
 * @param fromED {any} - the ElementDefinition JSON to check for unsupported types
 * @returns {boolean} true if any of the element types are not supported; false otherwise
 */
function isUnsupported(fromED: any): boolean {
  return fromED.type?.some((t: any) => t.code === 'Resource');
}

/**
 * Determines if the target element of the implied extension needs to be represented as a complex
 * extension. There are two basic reasons an element would require a complex extension
 * representation: (1) if it is a backbone element or element, since their child paths are always
 * defined inline; (2) if the element's type does not exist in the IG's specified version of FHIR.
 * Note that if the element is a choice, it must be represented as a simple extension since there
 * is no way to represent a choice in a complex extension.
 * @param fromED {any} - the ElementDefinition of the element that the implied extension represents
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitions object for the current project
 * @returns {boolean} true if the element should be represented using a complex extension; false
 *   if the element should be represented using a simple extension.
 */
function isComplex(fromED: any, defs: FHIRDefinitions): boolean {
  const codes: string[] = union(fromED.type?.map((t: any) => t.code));
  if (codes.length !== 1) {
    // We can't represent a choice as a complex extension
    return false;
  } else if (codes[0] === 'BackboneElement' || codes[0] === 'Element') {
    return true;
  }

  // Else if the type does not exist in this version of FHIR, we need to use a complex extension.
  const def = defs.fishForFHIR(codes[0], Type.Resource, Type.Type);
  return def == null || def._timeTraveler;
}

/**
 * Sets the top-level metadata fields on the extension's StructureDefinition, using the relevant
 * metadata from the source StructureDefinition and ElementDefinition that the extension
 * represents.
 * @param fromSD {any} - the JSON StructureDefinition containing the element to represent
 * @param fromED {any} - the JSON ElementDefinition that defines the element to represent
 * @param fromVersion {string} - the version portion of the extension URL (e.g., 1.0, 3.0, etc.)
 * @param toExt {StructurDefinition} - the implied extension's StructureDefinition
 */
function applyMetadataToExtension(
  fromSD: any,
  fromED: any,
  fromVersion: string,
  toExt: StructureDefinition
): void {
  const elementId = fromED.id ?? fromED.path;
  toExt.id = `extension-${elementId}`;
  toExt.url = `http://hl7.org/fhir/${fromVersion}/StructureDefinition/${toExt.id}`;
  toExt.version = fromSD.fhirVersion;
  toExt.name = `Extension_${elementId.replace(/[^A-Za-z0-9]/g, '_')}`;
  toExt.title = toExt.description = `Implied extension for ${elementId}`;
  toExt.date = new Date().toISOString();
  toExt.context = [{ expression: 'Element', type: 'element' }];
  toExt.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
  toExt.derivation = 'constraint';
}

/**
 * Sets metadata on an ElementDefinition in the implied extension using relevant metadata from the
 * source ElementDefinition.
 * @param fromED {any} - the JSON ElementDefinition to represent
 * @param toED {ElementDefinition} - an ElementDefinition from the implied extension
 */
function applyMetadataToElement(fromED: any, toED: ElementDefinition): void {
  toED.constrainCardinality(fromED.min, fromED.max);
  if (fromED.short) {
    toED.short = fromED.short;
  }
  if (fromED.definition) {
    toED.definition = fromED.definition;
  }
  if (fromED.comment || fromED.comments) {
    toED.comment = fromED.comment ?? fromED.comments;
  }
  if (fromED.requirements) {
    toED.requirements = fromED.requirements;
  }
  if (fromED.isModifier) {
    toED.isModifier = fromED.isModifier;
  }
  if (fromED.isModifierReason) {
    toED.isModifierReason = fromED.isModifierReason;
  }
}

/**
 * Given information about a source element to represent, the applyContent function will modify
 * the passed in element (from the implied extension) so that it can represent the actual content
 * of the source element (e.g., cardinality, types, bindings). This may result in the
 * ElementDefinition's value[x] being constrained (for simple extensions) or child elements being
 * added to represent sub-extensions (for complex extensions). This function can set content
 * starting at the StructureDefinition's root element or starting at an element representing a
 * sub-extension in the StructureDefinition.
 * @param fromSD {any} - the JSON StructureDefinition containing the element to represent
 * @param fromED {any} - the JSON ElementDefinition that defines the element to represent
 * @param fromVersion {string} - the version portion of the extension URL (e.g., 1.0, 3.0, etc.)
 * @param toExt {StructurDefinition} - the implied extension's StructureDefinition
 * @param toBaseED {ElementDefinition} - the ElementDefinition in the implied extension that should
 *   be modified to represent the content. This could be the root element of the implied extension,
 *   but in cases where a complex extension is needed, it might be the root of a sub-extension.
 * @param visitedTypes {string[]} - the types that have already been represented in this particular
 *   ElementDefinition's hierarchy. This is needed to avoid infinite recursion since complex
 *   extensions are defined to be fully self-contained (e.g., sub-extensions are defined inline
 *   rather than referenced by their URL).
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitions object for the current project
 * @param supplementalDefs {FHIRDefinitions} - the supplemental FHIRDefinitions object for the
 *   version of FHIR corresponding to the source element represented by the implied extension.
 */
function applyContent(
  fromSD: any,
  fromED: any,
  fromVersion: string,
  toExt: StructureDefinition,
  toBaseED: ElementDefinition,
  visitedTypes: string[],
  defs: FHIRDefinitions,
  supplementalDefs: FHIRDefinitions
): void {
  const url = toBaseED.sliceName ?? toExt.url;
  toExt.findElement(`${toBaseED.id}.url`).assignValue(url, true);
  const valueED = toExt.findElement(`${toBaseED.id}.value[x]`);
  const extensionED = toExt.findElement(`${toBaseED.id}.extension`);
  if (isComplex(fromED, defs)) {
    applyToExtensionElement(
      fromSD,
      fromED,
      fromVersion,
      toExt,
      extensionED,
      visitedTypes.slice(0), // pass down a clone so that siblings aren't adding to the same array (we only care recursive descendents)
      defs,
      supplementalDefs
    );
    valueED.constrainCardinality(0, '0');
  } else {
    applyToValueXElement(fromED, fromVersion, toExt, valueED, defs);
    extensionED.constrainCardinality(0, '0');
  }
}

/**
 * Given information about a source element to represent, the applyToValueXElement function will
 * modify the passed in value[x] ElementDefinition to represent the applicable content from the
 * source element (e.g., cardinality, types, bindings).
 * @param fromED {any} - the JSON ElementDefinition that defines the element to represent
 * @param fromVersion {string} - the version portion of the extension URL (e.g., 1.0, 3.0, etc.)
 * @param toExt {StructurDefinition} - the implied extension's StructureDefinition
 * @param toED {ElementDefinition} - a value[x] ElementDefinition in the implied extension
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitions object for the current project
 */
function applyToValueXElement(
  fromED: any,
  fromVersion: string,
  toExt: StructureDefinition,
  toED: ElementDefinition,
  defs: FHIRDefinitions
): void {
  toED.type = getTypes(fromED, fromVersion);
  if (fromED.binding) {
    toED.bindToVS(
      // Handle different representation in DSTU2 and STU3
      fromED.binding.valueSet ??
        fromED.binding.valueSetUri ??
        fromED.binding.valueSetReference?.reference,
      fromED.binding.strength
    );
    if (fromED.binding.description) {
      toED.binding.description = fromED.binding.description;
    }
    // NOTE: Even though there might be extensions on bindings, we are intentionally not carrying
    // them over because (a) it's not clear that we should, (b) the extension might not exist in
    // our version of FHIR, (c) the extension might exist but its definition may have changed, and
    // (d) if we support extensions on binding, shouldn't we support them everywhere?  Where do you
    // draw the line?  So... we favor sanity and maintainability over implementing something that
    // is very likely totally unecessary and inconsequential anyway.
  }
  filterAndFixTypes(toExt, toED, defs);
}

/**
 * Given information about a source element to represent, the applyToExtensionElement function will
 * create and modify the relevant sub-extensions on the passed in extension element.
 * @param fromSD {any} - the JSON StructureDefinition containing the element to represent
 * @param fromED {any} - the JSON ElementDefinition that defines the element to represent
 * @param fromVersion {string} - the version portion of the extension URL (e.g., 1.0, 3.0, etc.)
 * @param toExt {StructurDefinition} - the implied extension's StructureDefinition
 * @param toED {ElementDefinition} - an extension ElementDefinition in the implied extension
 * @param visitedTypes {string[]} - the types that have already been represented in this particular
 *   ElementDefinition's hierarchy. This is needed to avoid infinite recursion since complex
 *   extensions are defined to be fully self-contained (e.g., sub-extensions are defined inline
 *   rather than referenced by their URL).
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitions object for the current project
 * @param supplementalDefs {FHIRDefinitions} - the supplemental FHIRDefinitions object for the
 *   version of FHIR corresponding to the source element represented by the implied extension.
 */
function applyToExtensionElement(
  fromSD: any,
  fromED: any,
  fromVersion: string,
  toExt: StructureDefinition,
  toED: ElementDefinition,
  visitedTypes: string[],
  defs: FHIRDefinitions,
  supplementalDefs: FHIRDefinitions
): void {
  let edId: string = fromED.id ?? fromED.path;
  // First look for children directly in the SD
  let childElements = fromSD.snapshot.element.filter((e: any) =>
    (e.id ?? e.path).startsWith(`${edId}.`)
  );
  // If no children are found, this may be a type not supported in this version of FHIR,
  // so use the unknown type's children instead
  if (childElements.length === 0) {
    const edTypes = getTypes(fromED, fromVersion);
    if (edTypes.length === 1) {
      const typeSD = supplementalDefs.fishForFHIR(edTypes[0].code, Type.Resource, Type.Type);
      if (typeSD) {
        if (visitedTypes.indexOf(typeSD.url) !== -1) {
          // Infinite recursion should be rare, and perhaps never happens under normal circumstances, but it
          // could happen if an unknown type (which we are handling here) has an element whose type is itself.
          // In testing, this happened because the test environment did not have all types, and an unknown primitive
          // type's value element referred back to itself (via the special FHIRPath URL). Anyway, this code
          // stops those kinds of shenanigans!
          const parentId = toED.id.replace(/\.extension$/, '');
          logger.warn(
            `Definition of extension (${toExt.url}) is incomplete because ${parentId} causes ` +
              'sub-extension recursion.'
          );
          return;
        } else {
          visitedTypes.push(typeSD.url);
        }
        // Reset edId to the root of the type's SD since all paths will be relative to it
        edId = typeSD.id ?? typeSD.path;
        childElements = typeSD.snapshot.element.slice(1);
      }
    }
  }
  // Now go through the child elements building up the complex extensions structure
  childElements.forEach((e: any) => {
    const id: string = e.id ?? e.path;
    const tail = id.slice(edId.length + 1);
    if (tail.indexOf('.') === -1 && !IGNORED_CHILDREN.includes(tail)) {
      const slice = toED.addSlice(tail);
      applyMetadataToElement(e, slice);
      slice.type = [new ElementDefinitionType('Extension')];
      slice.unfold(defs);
      applyContent(
        fromSD,
        e,
        fromVersion,
        toExt,
        slice,
        visitedTypes.slice(0), // pass down a clone so that siblings aren't adding to the same array (we only care recursive descendents)
        defs,
        supplementalDefs
      );
    }
  });
  // Now apply special logic to handle R5 CodeableReference, which puts bindings and type restrictions
  // on the CodeableReference instead of underlying concept and reference elemenst
  if (fromED.type?.[0]?.code === 'CodeableReference') {
    if (fromED.binding) {
      const crConcept = toExt.findElement(`${toED.id}:concept.value[x]`);
      crConcept.bindToVS(fromED.binding.valueSet, fromED.binding.strength);
      if (fromED.binding.description) {
        crConcept.binding.description = fromED.binding.description;
      }
    }
    if (fromED.type[0].targetProfile?.length > 0) {
      const crRef = toExt.findElement(`${toED.id}:reference.value[x]`);
      crRef.type[0].targetProfile = fromED.type[0].targetProfile.slice(0);
      filterAndFixTypes(toExt, crRef, defs);
    }
  }
}

/**
 * Given a JSON ElementDefinition defining the element to represent in an implied extension, the getTypes
 * function will convert the types from their original format (e.g., DSTU2, STU3) to an R4-compatible set
 * of types. This is needed because (1) DSTU2 types don't have a 'targetProfile' property, and (2) STU3
 * types represent the 'profile' and 'targetProfile' properties as single objects instead of arrays.
 * @param fromED {any} - the JSON ElementDefinition that defines the element to represent
 * @param fromVersion {string} - the version portion of the extension URL (e.g., 1.0, 3.0, etc.)
 * @returns {ElementDefinitionType}[] the R4-compatible set of type objects
 */
function getTypes(fromED: any, fromVersion: string): ElementDefinitionType[] {
  if (fromED.type == null || fromED.type.length === 0) {
    return [];
  } else if (fromVersion === '4.0' || fromVersion === '5.0') {
    return fromED.type.map(ElementDefinitionType.fromJSON);
  } else if (fromVersion === '3.0') {
    // STU3 only has 0..1 profile and 0..1 targetProfile, so multiple profiles are represented as multiple types w/ duplicated codes.
    // We need to merge these multiple types w/ the same code into single R4 types where applicable.
    const r4types: ElementDefinitionType[] = [];
    for (const r3Type of fromED.type as R3Type[]) {
      let r4Type = r4types.find(t => t.code === r3Type.code);
      if (r4Type == null) {
        r4Type = new ElementDefinitionType(r3Type.code);
        r4types.push(r4Type);
      }
      if (r3Type.profile != null) {
        r4Type.profile = union(r4Type.profile ?? [], [r3Type.profile]);
      }
      if (r3Type.targetProfile != null) {
        r4Type.targetProfile = union(r4Type.targetProfile ?? [], [r3Type.targetProfile]);
      }
      if (r3Type.aggregation != null) {
        r4Type.aggregation = union(r4Type.aggregation ?? [], r3Type.aggregation);
      }
      if (r3Type.versioning != null) {
        // There's only room for one, so last in wins
        r4Type.versioning = r3Type.versioning;
      }
    }
    return r4types;
  } else if (fromVersion === '1.0') {
    // DSTU2 has 0..* profile but no targetProfile, so if it is a Reference, make it a targetProfile.
    // It also sometimes represents the same type.code over multiple types, so normalize those.
    const r4types: ElementDefinitionType[] = [];
    for (const r2Type of fromED.type as R2Type[]) {
      let r4Type = r4types.find(t => t.code === r2Type.code);
      if (r4Type == null) {
        r4Type = new ElementDefinitionType(r2Type.code);
        r4types.push(r4Type);
      }
      if (r2Type.profile != null) {
        if (r2Type.code === 'Reference') {
          r4Type.targetProfile = union(r4Type.targetProfile ?? [], r2Type.profile);
        } else {
          r4Type.profile = union(r4Type.profile ?? [], r2Type.profile);
        }
      }
      if (r2Type.aggregation != null) {
        r4Type.aggregation = union(r4Type.aggregation ?? [], r2Type.aggregation);
      }
    }
    return r4types;
  }
}

/**
 * The filterAndFixTypes function processes the provided ElementDefinition's types, which have
 * been populated using the source (other version of FHIR) element's types and (1) removes all
 * types that cannot be represented as an R4/R5 type, and (2) converts renamed types where
 * possible (e.g., MedicationOrder --> MedicationRequest).
 * @param toExt {StructurDefinition} - the implied extension's StructureDefinition
 * @param toED {ElementDefinition} - a value[x] ElementDefinition in the implied extension
 * @param defs {FHIRDefinitions} - the primary FHIRDefinitions object for the current project
 */
function filterAndFixTypes(
  toExt: StructureDefinition,
  toED: ElementDefinition,
  defs: FHIRDefinitions
): void {
  const unsupportedTypes: string[] = [];
  toED.type = toED.type?.filter(t => {
    // Maintain types w/ no code; they're valid but there's nothing for us to do. NOTE: these should be rare.
    if (t.code == null) {
      return true;
    }
    // Unknown codes are handled by a complex extension when there is only one type, but in a choice we
    // should just filter them out so they're no longer a choice (since they're not valid in this version of FHIR).
    if (defs.fishForFHIR(t.code, Type.Resource, Type.Type) == null) {
      unsupportedTypes.push(t.code);
      return false;
    }
    // Remove unknown profile references.
    // NOTE: Search extension definitions since extensions are { code: 'Extension', profile: '{extensionURL}' }.
    t.profile = t.profile?.filter(p => {
      if (defs.fishForFHIR(p, Type.Profile, Type.Extension) == null) {
        unsupportedTypes.push(p);
        return false;
      }
      return true;
    });
    // If we're left with none (or there were none), it's better to leave the type wide open.
    if (t.profile?.length === 0) {
      delete t.profile;
    }
    // Replace unknown reference target resources with corresponding known replacement resources
    // (e.g., MedicationOrder -> MedicationRequest). If no replacement exists, filter it out.
    t.targetProfile = t.targetProfile
      ?.map(p => {
        if (defs.fishForFHIR(p, Type.Resource, Type.Profile)) {
          return p;
        }
        // It wasn't found, so try to find a renamed resource
        const match = p.match(/^http:\/\/hl7\.org\/fhir\/StructureDefinition\/(.+)$/);
        if (match) {
          const renamed = RESOURCE_TO_RESOURCE_MAP[match[1]];
          if (renamed) {
            return `http://hl7.org/fhir/StructureDefinition/${renamed}`;
          }
        }
        unsupportedTypes.push(p);
        return null;
      })
      .filter(p => p != null);
    // If we're left with none (or there were none), it's better to leave the reference wide open.
    if (t.targetProfile?.length === 0) {
      delete t.targetProfile;
    }
    return true;
  });
  if (unsupportedTypes.length > 0) {
    const typesHave = unsupportedTypes.length === 1 ? 'type has' : 'types have';
    logger.warn(
      `Definition of extension (${toExt.url}) is incomplete since the following ${typesHave} no ` +
        `equivalent in FHIR ${toExt.fhirVersion}: ${unsupportedTypes.join(', ')}.`
    );
  }
}

type R3Type = {
  code: string;
  profile?: string;
  targetProfile?: string;
  aggregation?: string[];
  versioning?: string;
};

type R2Type = {
  code: string;
  profile?: string[];
  aggregation?: string[];
};
