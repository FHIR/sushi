import { ResolveFn, StructureDefinition, PathPart, ElementDefinition } from '.';

/**
 * This function sets an instance property of an SD or ED if possible
 * @param {StructureDefinition | ElementDefinition} - The instance to fix a value on
 * @param {string} path - The path to fix a value at
 * @param {any} value - The value to fix
 * @param {ResolveFn} resolve - A function that can resolve a type to a StructureDefinition instance
 */
export function setPropertyOnInstance(
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
  if (fixedValue != null) {
    // If we can fix the value on the StructureDefinition StructureDefinition, then we can set the
    // instance property here
    let current: any = instance;
    for (const [i, pathPart] of pathParts.entries()) {
      const key = pathPart.base;
      // If this part of the path indexes into an array, the index will be the last bracket
      const index = getArrayIndex(pathPart);
      if (index != null) {
        // If the array doesn't exist, create it
        if (current[key] == null) current[key] = [];
        // If the index doesn't exist in the array, add it and lesser indices
        if (index >= current[key].length) {
          current[key][index] = {};
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
