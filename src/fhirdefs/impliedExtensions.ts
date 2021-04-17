// This file contains logic to support "implied" extensions, described in the FHIR spec here:
// http://hl7.org/fhir/versions.html#extensions

import { cloneDeep, union } from 'lodash';
import { logger, Type } from '../utils';
import { ElementDefinition, ElementDefinitionType, StructureDefinition } from '../fhirtypes';
import { FHIRDefinitions } from '../fhirdefs';

export const IMPLIED_EXTENSION_REGEX = /^http:\/\/hl7\.org\/fhir\/([1345]\.0)\/StructureDefinition\/extension-(([^./]+)\.[^\/]+)$/;

const VERSION_TO_PACKAGE_MAP: { [key: string]: string } = {
  '1.0': 'hl7.fhir.r2.core#1.0.2',
  '3.0': 'hl7.fhir.r3.core#3.0.2',
  '4.0': 'hl7.fhir.r4.core#4.0.1',
  '5.0': 'hl7.fhir.r5.core#current'
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
    logger.error(
      `Cannot materialize implied extension (${url}) since ${supplementalPackage} is not loaded`
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
  }

  const ext = StructureDefinition.fromJSON(defs.fishForFHIR('Extension'));
  applyMetadataToExtension(ext, sd, ed, version);
  applyMetadataToElement(ext.findElement('Extension'), ed);
  applyUrlElement(ext);
  if (isUnsupported(ed)) {
    logger.error(`Cannot materialize implied extension (${url}) since its type is Resource`);
    return;
  } else if (isComplex(ed, defs)) {
    handleComplexValue(ext, sd, ed, version);
  } else {
    handleSimpleValue(ext, ed, version);
  }

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

function applyUrlElement(ext: StructureDefinition): void {
  const url = ext.findElement('Extension.url');
  url.assignValue(ext.url, true);
}

function handleSimpleValue(ext: StructureDefinition, ed: any, version: string): void {
  const value = ext.findElement('Extension.value[x]');
  value.type = getTypes(ed, version);
  if (ed.binding) {
    value.bindToVS(
      // Handle different representation in DSTU2 and STU3
      ed.binding.valueSet ?? ed.binding.valueSetUri ?? ed.binding.valueSetReference.reference,
      ed.binding.strength
    );
    if (ed.binding.description) {
      value.binding.description = ed.binding.description;
    }
  }

  // Zero out the extension element
  ext.findElement('Extension.extension').constrainCardinality(0, '0');
}

function handleComplexValue(ext: StructureDefinition, sd: any, ed: any, version: string): void {
  // Create the sub-extensions
  const extRoot = ext.findElement('Extension.extension');
  const edId: string = ed.id ?? ed.path;
  sd.snapshot.element.forEach((e: any) => {
    const id: string = e.id ?? e.path;
    if (id?.startsWith(`${edId}.`)) {
      const tail = id.slice(edId.length + 1);
      if (tail.indexOf('.') === -1 && !IGNORED_CHILDREN.includes(tail)) {
        const slice = extRoot.addSlice(tail);
        applyMetadataToElement(slice, e);
        slice.type = [
          new ElementDefinitionType('Extension').withProfiles(
            `http://hl7.org/fhir/${version}/StructureDefinition/extension-${e.id ?? e.path}`
          )
        ];
      }
    }
  });

  // Zero out the value[x] element
  ext.findElement('Extension.value[x]').constrainCardinality(0, '0');
}

function getTypes(ed: any, version: string): ElementDefinitionType[] {
  if (version === '4.0' || version === '5.0') {
    return (ed.type ?? []).map(ElementDefinitionType.fromJSON);
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
    // DSTU2 has 0..* profile but no targetProfile, so if it is a Reference, make it a targetProfile
    return (ed.type || []).map((r2Type: R2Type) => {
      const r4Type = new ElementDefinitionType(r2Type.code);
      if (r2Type.code === 'Reference' && r2Type.profile != null) {
        r4Type.targetProfile = cloneDeep(r2Type.profile);
      }
      if (r2Type.aggregation != null) {
        r4Type.aggregation = union(r4Type.aggregation ?? [], r2Type.aggregation);
      }
      return r4Type;
    });
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
