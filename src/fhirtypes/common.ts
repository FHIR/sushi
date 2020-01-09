import { ResolveFn, StructureDefinition, PathPart, ElementDefinition, InstanceDefinition } from '.';
import { FixedValueRule } from '../fshtypes/rules';
import { FshReference } from '../fshtypes';
import { FSHTank } from '../import';
import cloneDeep = require('lodash/cloneDeep');

/**
 * This function sets an instance property of an SD or ED if possible
 * @param {StructureDefinition | ElementDefinition} - The instance to fix a value on
 * @param {string} path - The path to fix a value at
 * @param {any} value - The value to fix
 * @param {ResolveFn} resolve - A function that can resolve a type to a StructureDefinition instance
 */
export function setPropertyOnDefinitionInstance(
  instance: StructureDefinition | ElementDefinition,
  path: string,
  value: any,
  resolve: ResolveFn = () => undefined
): void {
  const structureDefinitionStructureDefinition = instance.getOwnStructureDefinition(resolve);
  const { fixedValue, pathParts } = structureDefinitionStructureDefinition.validateValueAtPath(
    path,
    value,
    resolve
  );
  setPropertyOnInstance(instance, pathParts, fixedValue);
}

export function setPropertyOnInstance(
  instance: StructureDefinition | ElementDefinition | InstanceDefinition,
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
      const index = getArrayIndex(pathPart);
      if (index != null) {
        // If the array doesn't exist, create it
        if (current[key] == null) current[key] = [];
        // If the index doesn't exist in the array, add it and lesser indices
        // Empty elements should be null, not undefined, according to https://www.hl7.org/fhir/json.html#primitive
        for (let j = 0; j <= index; j++) {
          if (j < current[key].length && j === index && current[key][index] == null) {
            current[key][index] = {};
          } else if (j >= current[key].length) {
            current[key].push(j === index ? {} : null);
          }
        }
        // If it isn't the last element, move on, if it is, set the value
        if (i < pathParts.length - 1) {
          current = current[key][index];
        } else {
          current[key][index] = fixedValue;
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
 * Replaces references to instances by the correct path to that instance
 * @param {FixedValueRule} rule - The rule to replace references on
 * @param {FSHTank} tank - The tank holding the instances
 * @param {ResolveFn} resolve - A function that can resolve to Structure Definitions
 * @returns {FixedValueRule} a clone of the rule if replacing is done, otherwise the original rule
 */
export function replaceReferences(
  rule: FixedValueRule,
  tank: FSHTank,
  resolve: ResolveFn
): FixedValueRule {
  let clone: FixedValueRule;
  if (rule.fixedValue instanceof FshReference) {
    const instance = tank.findInstance(rule.fixedValue.reference);
    const instanceSD = resolve(instance?.instanceOf);
    // If we can't find a matching instance, just leave the reference as is
    if (instance && instanceSD) {
      // If the instance has a rule setting id, that overrides instance.id
      const idRule = instance.rules.find(r => r.path === 'id');
      const id = idRule?.fixedValue ?? instance.id;
      clone = new FixedValueRule(rule.path);
      clone.fixedValue = cloneDeep(rule.fixedValue);
      clone.fixedValue.reference = `${instanceSD.type}/${id}`;
    }
  }
  return clone ?? rule;
}
