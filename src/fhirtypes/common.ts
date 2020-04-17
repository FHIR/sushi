import {
  StructureDefinition,
  PathPart,
  ElementDefinition,
  InstanceDefinition,
  ValueSet,
  CodeSystem
} from '.';
import { FixedValueRule, Rule } from '../fshtypes/rules';
import {
  FshReference,
  Instance,
  SourceInfo,
  FshCode,
  Profile,
  Extension,
  RuleSet
} from '../fshtypes';
import { FSHTank } from '../import';
import { Type, Fishable } from '../utils/Fishable';
import cloneDeep = require('lodash/cloneDeep');
import { logger } from '../utils';
import { FHIRId, idRegex } from './primitiveTypes';

export function splitOnPathPeriods(path: string): string[] {
  return path.split(/\.(?![^\[]*\])/g); // match a period that isn't within square brackets
}

/**
 * This function sets an instance property of an SD or ED if possible
 * @param {StructureDefinition | ElementDefinition} - The instance to fix a value on
 * @param {string} path - The path to fix a value at
 * @param {any} value - The value to fix
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 */
export function setPropertyOnDefinitionInstance(
  instance: StructureDefinition | ElementDefinition,
  path: string,
  value: any,
  fisher: Fishable
): void {
  const instanceSD = instance.getOwnStructureDefinition(fisher);
  const { fixedValue, pathParts } = instanceSD.validateValueAtPath(path, value, fisher);
  setPropertyOnInstance(instance, pathParts, fixedValue);
}

export function setPropertyOnInstance(
  instance: StructureDefinition | ElementDefinition | InstanceDefinition | ValueSet | CodeSystem,
  pathParts: PathPart[],
  fixedValue: any
): void {
  if (fixedValue != null) {
    // If we can fix the value on the StructureDefinition StructureDefinition, then we can set the
    // instance property here
    let current: any = instance;
    for (const [i, pathPart] of pathParts.entries()) {
      // When a primitive has child elements, a _ is appended to the name of the primitive
      // According to https://www.hl7.org/fhir/json.html#primitive
      const key =
        pathPart.primitive && i < pathParts.length - 1 ? `_${pathPart.base}` : pathPart.base;
      // If this part of the path indexes into an array, the index will be the last bracket
      let index = getArrayIndex(pathPart);
      let sliceName: string;
      if (index != null) {
        // If the array doesn't exist, create it
        if (current[key] == null) current[key] = [];
        sliceName = getSliceName(pathPart);
        if (sliceName) {
          if (typeof fixedValue !== 'object') {
            // When a fixedValue is a primitive but also a slice, we convert to an object so that
            // the sliceName field can be tracked on the object. The _primitive field marks the object
            // to later be converted back to a primitive by replaceField in cleanInstance
            fixedValue = { fixedValue, _primitive: true };
          }
          const sliceIndices: number[] = [];
          // Find the indices where slices are placed
          current[pathPart.base]?.forEach((el: any, i: number) => {
            if (el?._sliceName === sliceName) {
              sliceIndices.push(i);
            }
          });
          // Convert the index in terms of the slice to the corresponding index in the overall array
          if (index >= sliceIndices.length) {
            index = index - sliceIndices.length + current[key].length;
          } else {
            index = sliceIndices[index];
          }
        }
        // If the index doesn't exist in the array, add it and lesser indices
        // Empty elements should be null, not undefined, according to https://www.hl7.org/fhir/json.html#primitive
        for (let j = 0; j <= index; j++) {
          if (j < current[key].length && j === index && current[key][index] == null) {
            current[key][index] = {};
          } else if (j >= current[key].length) {
            if (sliceName) {
              // _sliceName is used to later differentiate which slice an element represents
              current[key].push({ _sliceName: sliceName });
            } else if (j === index) {
              current[key].push({});
            } else {
              current[key].push(null);
            }
          }
        }
        // If it isn't the last element, move on, if it is, set the value
        if (i < pathParts.length - 1) {
          current = current[key][index];
          if (sliceName) {
            current._sliceName = sliceName;
          }
        } else {
          if (typeof fixedValue === 'object') {
            Object.assign(current[key][index], fixedValue);
          } else {
            current[key][index] = fixedValue;
          }
        }
      } else {
        // If it isn't the last element, move on, if it is, set the value
        if (i < pathParts.length - 1) {
          if (current[key] == null) current[key] = {};
          current = current[key];
        } else {
          current[key] = fixedValue;
        }
      }
    }
  }
}

/**
 * Tests to see if the last bracket in a PathPart is a non-negative int, and if so returns it
 * @param {PathPart} pathPart - The part of the path to test
 * @returns {number} The index if it exists and is non-negative, otherwise undefined
 *
 */
export function getArrayIndex(pathPart: PathPart): number {
  const lastBracket = pathPart.brackets?.slice(-1)[0];
  let arrayIndex: number;
  if (/^[-+]?\d+$/.test(lastBracket)) {
    arrayIndex = parseInt(lastBracket);
  }
  return arrayIndex >= 0 ? arrayIndex : null;
}

/**
 * Replaces references to instances by the correct path to that instance.
 * Replaces references to local code systems by the url for that code system.
 * @param {FixedValueRule} rule - The rule to replace references on
 * @param {FSHTank} tank - The tank holding the instances and code systems
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 * @returns {FixedValueRule} a clone of the rule if replacing is done, otherwise the original rule
 */
export function replaceReferences(
  rule: FixedValueRule,
  tank: FSHTank,
  fisher: Fishable
): FixedValueRule {
  let clone: FixedValueRule;
  if (rule.fixedValue instanceof FshReference) {
    const instance = tank.fish(rule.fixedValue.reference, Type.Instance) as Instance;
    const instanceMeta = fisher.fishForMetadata(
      instance?.instanceOf,
      Type.Resource,
      Type.Type,
      Type.Profile,
      Type.Extension
    );
    // If we can't find a matching instance, just leave the reference as is
    if (instance && instanceMeta) {
      // If the instance has a rule setting id, that overrides instance.id
      const idRule = instance.rules.find(r => r.path === 'id');
      const id = idRule?.fixedValue ?? instance.id;
      clone = cloneDeep(rule);
      const fv = clone.fixedValue as FshReference;
      fv.reference = `${instanceMeta.sdType}/${id}`;
    }
  } else if (rule.fixedValue instanceof FshCode) {
    const codeSystem = tank.fish(rule.fixedValue.system, Type.CodeSystem);
    const codeSystemMeta = fisher.fishForMetadata(codeSystem?.name, Type.CodeSystem);
    if (codeSystem && codeSystemMeta) {
      clone = cloneDeep(rule);
      const fv = clone.fixedValue as FshCode;
      fv.system = codeSystemMeta.url;
    }
  }
  return clone ?? rule;
}

/**
 * Returns the sliceName for a set of pathParts
 * @param {PathPart} pathPart - The part of the path to get a sliceName for
 * @returns {string} The slicenName for the path part
 */
export function getSliceName(pathPart: PathPart): string {
  const arrayIndex = getArrayIndex(pathPart);
  const nonNumericBrackets =
    arrayIndex == null ? pathPart.brackets : pathPart.brackets.slice(0, -1);
  return nonNumericBrackets.join('/');
}

/**
 * Replaces fields in an object that match a certain condition
 * @param { {[key: string]: any} } object - The object to replace fields on
 * @param {(object: { [key: string]: any }, prop: string) => boolean} matchFn - The function to match with
 * @param {(object: { [key: string]: any }, prop: string) => void} replaceFn - The function to replace with
 */
export function replaceField(
  object: { [key: string]: any },
  matchFn: (object: { [key: string]: any }, prop: string) => boolean,
  replaceFn: (object: { [key: string]: any }, prop: string) => void
): void {
  for (const prop in object) {
    if (matchFn(object, prop)) {
      replaceFn(object, prop);
    } else if (typeof object[prop] === 'object') {
      replaceField(object[prop], matchFn, replaceFn);
    }
  }
}

/**
 * Adds Mixin rules onto a Profile, Extension, or Instance
 * @param {Profile | Extension | Instance} fshDefinition - The definition to apply mixin rules on
 * @param {FSHTank} tank - The FSHTank containing the fshDefinition
 */
export function applyMixinRules(
  fshDefinition: Profile | Extension | Instance,
  tank: FSHTank
): void {
  // Rules are added to beginning of rules array, so add the last mixin rules first
  const mixedInRules: Rule[] = [];
  fshDefinition.mixins.forEach(mixinName => {
    const ruleSet = tank.fish(mixinName, Type.RuleSet) as RuleSet;
    if (ruleSet) {
      ruleSet.rules.forEach(r => {
        // Record source information of Profile/Extension/Instance on which Mixin is applied
        r.sourceInfo.appliedFile = fshDefinition.sourceInfo.file;
        r.sourceInfo.appliedLocation = fshDefinition.sourceInfo.location;
      });
      const rules = ruleSet.rules.filter(r => {
        if (fshDefinition instanceof Instance && !(r instanceof FixedValueRule)) {
          logger.error(
            'Rules applied by mixins to an instance must fix a value. Other rules are ignored.',
            r.sourceInfo
          );
          return false;
        }
        return true;
      });
      mixedInRules.push(...rules);
    } else {
      logger.error(`Unable to find definition for RuleSet ${mixinName}.`, fshDefinition.sourceInfo);
    }
  });
  fshDefinition.rules = [...mixedInRules, ...fshDefinition.rules];
}

/**
 * Finds all FSH paths implied by the FSH path pointing at element. Paths are implied by array elements.
 * For example, if foo is 2..* and bar is 2..*, and bar has a fixed value of "hello", then the rule
 * "foo[0].baz = "hey" " implies the following:
 * foo[0].baz = "hey"
 * foo[0].bar[0] = "hello"
 * foo[1].bar[0] = "hello"
 * foo[0].bar[1] = "hello"
 * foo[1].bar[1] = "hello"
 * @param {ElementDefinition} element - The element that the path corresponds to
 * @param {path} string - The FSH path to the element
 * @returns {string[]} - All implied FSH paths by the path pointing to element
 */
export function getAllImpliedPaths(element: ElementDefinition, path: string): string[] {
  const parentPaths = [];
  const parent = element.parent();
  if (parent) {
    if (parent.min === 0) {
      // If the parent has min = 0, then the path above this point has no additional implied paths
      // so add the path to this point to the parentPaths
      parentPaths.push(splitOnPathPeriods(path).slice(0, -1).join('.'));
    } else {
      // If min >= 1, the parent or its parents my have implied paths, recursively find those
      parentPaths.push(
        ...this.getAllImpliedPaths(parent, splitOnPathPeriods(path).slice(0, -1).join('.'))
      );
    }
  } else {
    parentPaths.push('');
  }
  const pathEnd = splitOnPathPeriods(path).slice(-1)[0];
  const pathEnds = [pathEnd];
  if (element.max === '*' || parseInt(element.max) > 1) {
    // Index 0 element doesn't need index, since it is implied
    for (let i = 1; i < element.min; i++) {
      pathEnds.push(`${pathEnd}[${i}]`);
    }
  }
  const finalPaths = [];
  for (const parentPath of parentPaths) {
    for (const pathEnd of pathEnds) {
      // Combine the parentPaths with the pathEnds
      finalPaths.push(`${parentPath == '' ? '' : parentPath + '.'}${pathEnd}`);
    }
  }
  return finalPaths;
}

/**
 * Tests if resourceType is a valid FHIR resource that is a subtype of type. This is the case
 * if type is Resource, or if type is DomainResource and resourceType is one of the resources
 * that inherits from DomainResource, or if type is equal to resourceType.
 * @param {string} resourceType - The resourceType to test inheritance of
 * @param {string} type - The original type being inherited from
 * @param {Fishable} fisher - A fisher for finding FHIR definitions
 * @param {boolean} allowProfile - True if profiles of inherited resource should be allowed
 * @returns {boolean} true if resourceType is a valid sub-type of type, false otherwise
 */
export function isInheritedResource(
  resourceType: string,
  type: string,
  fisher: Fishable,
  allowProfile = false
): boolean {
  const types = allowProfile ? [Type.Resource, Type.Profile] : [Type.Resource];
  const resource = fisher.fishForFHIR(resourceType, ...types);
  if (resource) {
    if (allowProfile) {
      resourceType = resource.resourceType;
    }
    return (
      type === 'Resource' ||
      (type === 'DomainResource' &&
        // These are the only 3 resources not inherited from DomainResource
        // https://www.hl7.org/fhir/domainresource.html#bnr
        !['Bundle', 'Parameters', 'Binary'].includes(resourceType)) ||
      type === resourceType
    );
  }
}

const nameRegex = /^[A-Z]([A-Za-z0-9_]){0,254}$/;

export class HasName {
  name?: string;
  /**
   * Set the name and check if it matches the regular expression specified
   * in the invariant for "name" properties. A name must be between 1 and 255 characters long,
   * begin with an uppercase letter, and contain only uppercase letter, lowercase letter,
   * numeral, and '_' characters.
   * If the string does not match, log an error.
   *
   * @see {@link http://hl7.org/fhir/R4/structuredefinition-definitions.html#StructureDefinition.name}
   * @see {@link http://hl7.org/fhir/R4/valueset-definitions.html#ValueSet.name}
   * @see {@link http://hl7.org/fhir/R4/codesystem-definitions.html#CodeSystem.name}
   * @param {string} name - The name to check against the name invariant
   * @param {SourceInfo} sourceInfo - The FSH file and location that specified the name
   */
  setName(name: string, sourceInfo: SourceInfo) {
    this.name = name;
    if (!nameRegex.test(name)) {
      logger.error(
        `The string "${name}" does not represent a valid FHIR name. Valid names start with an upper-case ASCII letter ('A'..'Z') followed by any combination of of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9') and '_', with a length limit of 255 characters.`,
        sourceInfo
      );
    }
  }
}

export class HasId {
  id?: FHIRId;
  /**
   * Set the id and check if it matches the regular expression specified
   * in the definition of the "id" type.
   * If the FHIRId does not match, log an error.
   *
   * @param id - The new id to set
   * @param sourceInfo - The FSH file and location that specified the id
   */
  setId(id: FHIRId, sourceInfo: SourceInfo) {
    this.id = id;
    this.validateId(sourceInfo);
  }

  /**
   * Check if the current id matches the regular expression specified
   * in the definition of the "id" type.
   * If the FHIRId does not match, log an error.
   *
   * @param sourceInfo - The FSH file and location that specified the id
   */
  validateId(sourceInfo: SourceInfo) {
    if (!idRegex.test(this.id)) {
      logger.error(
        `The string "${this.id}" does not represent a valid FHIR id. FHIR ids may contain any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.`,
        sourceInfo
      );
    }
  }
}
