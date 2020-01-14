import { ResolveFn, StructureDefinition, PathPart, ElementDefinition, InstanceDefinition } from '.';
import { FixedValueRule } from '../fshtypes/rules';
import { FshReference, Instance } from '../fshtypes';
import { FSHTank } from '../import';
import cloneDeep = require('lodash/cloneDeep');
import { Type } from '../utils/Fishable';

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
      let index = getArrayIndex(pathPart);
      let sliceName: string;
      if (index != null) {
        // If the array doesn't exist, create it
        if (current[key] == null) current[key] = [];
        sliceName = getSliceName(pathPart);
        if (sliceName) {
          const sliceIndices: number[] = [];
          // Find the indices where slices are placed
          current[key].forEach((el: any, i: number) => {
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
            // _sliceName is used to later differentiate which slice an element represents
            const arrayFiller = sliceName ? { _sliceName: sliceName } : null;
            current[key].push(j === index ? {} : arrayFiller);
          }
        }
        // If it isn't the last element, move on, if it is, set the value
        if (i < pathParts.length - 1) {
          current = current[key][index];
          if (sliceName) {
            current._sliceName = sliceName;
          }
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
    const instance = tank.fish(rule.fixedValue.reference, Type.Instance) as Instance;
    const instanceSD = resolve(instance?.instanceOf);
    // If we can't find a matching instance, just leave the reference as is
    if (instance && instanceSD) {
      // If the instance has a rule setting id, that overrides instance.id
      const idRule = instance.rules.find(r => r.path === 'id');
      const id = idRule?.fixedValue ?? instance.id;
      clone = cloneDeep(rule);
      const fv = clone.fixedValue as FshReference;
      fv.reference = `${instanceSD.type}/${id}`;
    }
  }
  return clone ?? rule;
}

/* Returns the sliceName for a set of pathParts
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
