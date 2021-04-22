// This file contains logic to support "implied" extensions, described in the FHIR spec here:
// http://hl7.org/fhir/versions.html#extensions

import { union } from 'lodash';
import { logger, Type } from '../utils';
import { ElementDefinition, ElementDefinitionType, StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';

export const IMPLIED_EXTENSION_REGEX = /^http:\/\/hl7\.org\/fhir\/([1345]\.0)\/StructureDefinition\/extension-(([^./]+)\.[^\/]+)$/;

// This map represents the relationship from the version part of the extension URL to the FHIR package
const VERSION_TO_PACKAGE_MAP: { [key: string]: string } = {
  '1.0': 'hl7.fhir.r2.core#1.0.2',
  '3.0': 'hl7.fhir.r3.core#3.0.2',
  '4.0': 'hl7.fhir.r4.core#4.0.1',
  '5.0': 'hl7.fhir.r5.core#current'
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

export function isImpliedExtension(url: string) {
  return IMPLIED_EXTENSION_REGEX.test(url);
}

export function materializeImpliedExtension(url: string, defs: FHIRDefinitions): any {
  const match = url.match(IMPLIED_EXTENSION_REGEX);
  if (match == null) {
    logger.error(
      `Cannot materialize implied extension (${url}) since the URL does not match the implied extension pattern ` +
        'http://hl7.org/fhir/[version]/StructureDefinition/extension-[Path]} with version 1.0, 3.0, 4.0, or 5.0.'
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
      `Cannot materialize implied extension: ${url}.\n` +
        'To fix this, add the following dependency to your sushi-config.yaml file:\n' +
        `  hl7.fhir.extensions.${extRelease}: ${fhirVersion}`
    );
    return;
  }

  const sd = supplementalDefs.fishForFHIR(type);
  if (sd == null) {
    logger.error(
      `Cannot materialize implied extension (${url}) since ${type} is not a valid resource or data type in ${supplementalPackage}`
    );
    return;
  }

  // NOTE: DSTU2 definitions don't populate element id, so fallback to path in that case
  const ed = sd.snapshot.element.find((ed: any) => (ed.id ?? ed.path) === id);
  if (ed == null) {
    logger.error(
      `Cannot materialize implied extension (${url}) since ${id} is not a valid id in ${type}`
    );
    return;
  } else if (isUnsupported(ed)) {
    logger.error(`Cannot materialize implied extension (${url}) since its type is Resource`);
    return;
  }

  const ext = StructureDefinition.fromJSON(defs.fishForFHIR('Extension'));
  applyMetadataToExtension(ext, sd, ed, version);
  const rootElement = ext.findElement('Extension');
  applyMetadataToElement(rootElement, ed);
  applyContent(sd, ed, version, ext, rootElement, [], defs, supplementalDefs);

  return ext.toJSON(true);
}

function isUnsupported(ed: any): boolean {
  // According to documentation, elements with type "Resource" are not supported
  return ed.type?.some((t: any) => t.code === 'Resource');
}

function isComplex(ed: any, defs: FHIRDefinitions): boolean {
  const codes: string[] = union(ed.type?.map((t: any) => t.code));
  if (codes.length !== 1) {
    // We can't represent a choice as a complex extension
    return false;
  } else if (codes[0] === 'BackboneElement' || codes[0] === 'Element') {
    return true;
  }

  // Else if the type does not exist in this version of FHIR, we need to use a complex extension.
  return defs.fishForFHIR(codes[0], Type.Resource, Type.Type) == null;
}

function applyMetadataToExtension(
  ext: StructureDefinition,
  sd: any,
  ed: any,
  version: string
): StructureDefinition {
  const elementId = ed.id ?? ed.path;
  ext.id = `extension-${elementId}`;
  ext.url = `http://hl7.org/fhir/${version}/StructureDefinition/${ext.id}`;
  ext.version = sd.fhirVersion;
  ext.name = `Extension_${elementId.replace(/[^A-Za-z0-9]/g, '_')}`;
  ext.title = ext.description = `Implied extension for ${elementId}`;
  ext.date = new Date().toISOString();
  ext.context = [{ expression: 'Element', type: 'element' }];
  ext.baseDefinition = 'http://hl7.org/fhir/StructureDefinition/Extension';
  ext.derivation = 'constraint';
  return ext;
}

function applyMetadataToElement(element: ElementDefinition, ed: any): void {
  element.constrainCardinality(ed.min, ed.max);
  if (ed.short) {
    element.short = ed.short;
  }
  if (ed.definition) {
    element.definition = ed.definition;
  }
  if (ed.comment || ed.comments) {
    element.comment = ed.comment ?? ed.comments;
  }
  if (ed.requirements) {
    element.requirements = ed.requirements;
  }
  if (ed.isModifier) {
    element.isModifier = ed.isModifier;
  }
  if (ed.isModifierReason) {
    element.isModifierReason = ed.isModifierReason;
  }
}

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
        fromED.binding.valueSetReference.reference,
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
            `Implied extension (${toExt.url}) is incomplete because ${parentId} causes sub-extension recursion.`
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
      applyMetadataToElement(slice, e);
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

function getTypes(ed: any, version: string): ElementDefinitionType[] {
  if (ed.type == null || ed.type.length === 0) {
    return [];
  } else if (version === '4.0' || version === '5.0') {
    return ed.type.map(ElementDefinitionType.fromJSON);
  } else if (version === '3.0') {
    // STU3 only has 0..1 profile and 0..1 targetProfile, so multiple profiles are represented as multiple types w/ duplicated codes.
    // We need to merge these multiple types w/ the same code into single R4 types where applicable.
    const r4types: ElementDefinitionType[] = [];
    for (const r3Type of ed.type as R3Type[]) {
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
  } else if (version === '1.0') {
    // DSTU2 has 0..* profile but no targetProfile, so if it is a Reference, make it a targetProfile.
    // It also sometimes represents the same type.code over multiple types, so normalize those.
    const r4types: ElementDefinitionType[] = [];
    for (const r2Type of ed.type as R2Type[]) {
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

function filterAndFixTypes(
  ext: StructureDefinition,
  ed: ElementDefinition,
  defs: FHIRDefinitions
): void {
  const unsupportedTypes: string[] = [];
  ed.type = ed.type?.filter(t => {
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
      `Implied extension (${ext.url}) is incomplete since the following ${typesHave} no ` +
        `equivalent in FHIR ${ext.fhirVersion}: ${unsupportedTypes.join(', ')}.`
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
