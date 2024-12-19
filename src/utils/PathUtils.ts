import { flatten } from 'lodash';
import { InstanceDefinition, PathPart } from '../fhirtypes';
import { splitOnPathPeriods } from '../fhirtypes/common';
import { CaretValueRule, Rule } from '../fshtypes/rules';
import { logger } from './FSHLogger';

/**
 * Parses a FSH Path into a more easily usable form
 * @param {string} fshPath - A syntactically valid path in FSH
 * @returns {PathPart[]} an array of PathParts that is easier to work with
 */
export function parseFSHPath(fshPath: string): PathPart[] {
  const pathParts: PathPart[] = [];
  const seenSlices: string[] = [];
  const indexRegex = /^[0-9]+$/;
  const splitPath = fshPath === '.' ? [fshPath] : splitOnPathPeriods(fshPath);
  for (const pathPart of splitPath) {
    const parsedPart: { base: string; brackets?: string[]; slices?: string[] } = {
      base: pathPart.match(/^([^\[]+(\[x\])?)/)?.[0] ?? ''
    };
    if (pathPart.length > parsedPart.base.length) {
      // Get the content from the outermost bracket pairs. (?![^\[]*\]) ensures we don't
      // match nested closing brackets (thank you, claude.ai)
      parsedPart.brackets = Array.from(
        pathPart.slice(parsedPart.base.length).matchAll(/\[([^\[\]]|\[(?:[^\[\]]*)\])*\]/g)
      ).map(match => match[0].slice(1, -1));
      seenSlices.push(
        ...parsedPart.brackets.filter(b => !indexRegex.test(b) && !(b === '+' || b === '='))
      );
      if (seenSlices.length > 0) {
        parsedPart.slices = [...seenSlices];
      }
    }
    pathParts.push(parsedPart);
  }
  return pathParts;
}

/**
 * Assembles a PathPart array back to its original form
 * @param {PathPart[]} pathParts - An array of pathParts
 * @returns {string} path - The path corresponding to those pathParts
 */
export function assembleFSHPath(pathParts: PathPart[]): string {
  let path = '';
  pathParts.forEach((pathPart, i) => {
    path += pathPart.base;
    pathPart.brackets?.forEach(bracket => (path += `[${bracket}]`));
    if (i < pathParts.length - 1) {
      path += '.';
    }
  });
  return path;
}

/**
 * Allows named slices to be accessed without a name - they can be accessed
 * via the numeric index or soft index they will eventually appear at.
 * @param {PathPart} element - A single element in a rules path
 * @param {Map<string, number} pathMap - A map containing an element's name as the key and that element's updated index as the value
 */

function convertSoftIndices(element: PathPart, pathMap: Map<string, number>) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;
  if (!pathMap.has(mapName)) {
    const existingNumericBracket = element.brackets?.find(bracket => indexRegex.test(bracket));
    if (existingNumericBracket) {
      pathMap.set(mapName, parseInt(existingNumericBracket));
    } else {
      pathMap.set(mapName, 0);
      if (element.brackets?.includes('+')) {
        element.brackets[element.brackets.indexOf('+')] = '0';
      } else if (element.brackets?.includes('=')) {
        // If a sequence begins with a '=', we log an error but assume a value of 0
        element.brackets[element.brackets.indexOf('=')] = '0';
        throw new Error(
          'The first index in a Soft Indexing sequence must be "+", an actual index of "0" has been assumed'
        );
      }
    }
  } else {
    element.brackets?.forEach((bracket: string, index: number) => {
      if (bracket === '+') {
        const newIndex = pathMap.get(mapName) + 1;
        element.brackets[index] = newIndex.toString();
        pathMap.set(mapName, newIndex);
      } else if (bracket === '=') {
        const currentIndex = pathMap.get(mapName);
        element.brackets[index] = currentIndex.toString();
      } else if (indexRegex.test(bracket)) {
        // If a numeric index is found, we update our pathMap so subsequent soft indexes are converted in that context
        pathMap.set(mapName, parseInt(bracket));
      }
    });
  }
}

/**
 * Requires named slices to be accessed with a slice name - they cannot be accessed
 * via the numeric index or soft index they will eventually appear at. A soft index does not
 * access a slice without specifying the slice name. Soft indices can be used in conjunction
 * with named slices and are resolved within that named slice's context.
 * @param {PathPart} element - A single element in a rules path
 * @param {Map<string, number>} pathMap - A map containing an element's name as the key and that element's most recently used index as the value
 * @param {Map<string, number>} maxPathMap - A map containing an element's name as the key and that element's maximum index as the value
 */
function convertSoftIndicesStrict(
  element: PathPart,
  pathMap: Map<string, number>,
  maxPathMap: Map<string, number>
) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;
  let addToBaseElement: number; // track the amount of indices we need to add to the base element of a slice
  if (!pathMap.has(mapName)) {
    const existingNumericBracket = element.brackets?.find(bracket => indexRegex.test(bracket));
    if (existingNumericBracket) {
      const indexUsed = parseInt(existingNumericBracket);
      pathMap.set(mapName, indexUsed);
      maxPathMap.set(mapName, indexUsed);
      addToBaseElement = parseInt(existingNumericBracket) + 1;
    } else {
      pathMap.set(mapName, 0);
      maxPathMap.set(mapName, 0);
      addToBaseElement = 1;
      if (element.brackets?.includes('+')) {
        element.brackets[element.brackets.indexOf('+')] = '0';
      } else if (element.brackets?.includes('=')) {
        // If a sequence begins with a '=', we log an error but assume a value of 0
        element.brackets[element.brackets.indexOf('=')] = '0';
        throw new Error(
          'The first index in a Soft Indexing sequence must be "+", an actual index of "0" has been assumed'
        );
      }
    }
  } else {
    element.brackets?.forEach((bracket: string, index: number) => {
      if (bracket === '+') {
        const newIndex = pathMap.get(mapName) + 1;
        element.brackets[index] = newIndex.toString();
        pathMap.set(mapName, newIndex);
        if (newIndex > maxPathMap.get(mapName)) {
          addToBaseElement = newIndex - maxPathMap.get(mapName);
          maxPathMap.set(mapName, newIndex);
        }
      } else if (bracket === '=') {
        const currentIndex = pathMap.get(mapName);
        element.brackets[index] = currentIndex.toString();
      } else if (indexRegex.test(bracket)) {
        // If a numeric index is found, we update our pathMap so subsequent soft indexes are converted in that context
        const newIndex = parseInt(bracket);
        pathMap.set(mapName, newIndex);
        if (newIndex > maxPathMap.get(mapName)) {
          addToBaseElement = newIndex - maxPathMap.get(mapName);
          maxPathMap.set(mapName, newIndex);
        }
      }
    });
  }
  // if the element has slices, increment the less-sliced elements
  if (element.slices?.length > 0 && addToBaseElement != null) {
    for (let takeSlices = element.slices.length - 1; takeSlices >= 0; takeSlices--) {
      const lessSlicedMapName = `${element.prefix ?? ''}.${element.base}|${element.slices
        .slice(0, takeSlices)
        .join('|')}`;
      if (!pathMap.has(lessSlicedMapName)) {
        // if we are adding a new map entry for the less-sliced element,
        // subtract 1 from the amount to add, since the values we track start at 0.
        pathMap.set(lessSlicedMapName, addToBaseElement - 1);
        maxPathMap.set(lessSlicedMapName, addToBaseElement - 1);
      } else {
        const oldMax = maxPathMap.get(lessSlicedMapName);
        const newIndex = pathMap.get(lessSlicedMapName) + addToBaseElement;
        pathMap.set(lessSlicedMapName, newIndex);
        if (newIndex > oldMax) {
          maxPathMap.set(lessSlicedMapName, newIndex);
        }
      }
    }
  }
}

/**
 * Replaces soft indexes in rule paths with corresponding numbers
 * @param {Rule[]} rules - An array of Rules
 */
export function resolveSoftIndexing(rules: Array<Rule | CaretValueRule>, strict = false): void {
  const pathMap: Map<string, number> = new Map(); // tracks the current index at a path
  const maxPathMap: Map<string, number> = new Map(); // tracks the maximum index seen at a path
  const caretPathMap: Map<string, Map<string, number>> = new Map();
  const maxCaretPathMap: Map<string, Map<string, number>> = new Map();

  // Parsing and separating rules by base name and bracket indexes
  const parsedRules = rules.map(rule => {
    const parsedPath: { path: PathPart[]; caretPath?: PathPart[] } = {
      path: parseFSHPath(rule.path)
    };
    // If we have a CaretValueRule, we'll need a second round of parsing for the caret path
    if (rule instanceof CaretValueRule) {
      parsedPath.caretPath = parseFSHPath(rule.caretPath);
    }
    return parsedPath;
  });

  // Replacing Soft indexes with numbers
  parsedRules.forEach((parsedRule, ruleIndex) => {
    const originalRule = rules[ruleIndex];
    parsedRule.path.forEach((element: PathPart, elementIndex) => {
      // Add a prefix to the current element containing previously parsed rule elements
      element.prefix = assembleFSHPath(parsedRule.path.slice(0, elementIndex));
      try {
        if (strict) {
          convertSoftIndicesStrict(element, pathMap, maxPathMap);
        } else {
          convertSoftIndices(element, pathMap);
        }
      } catch (e) {
        logger.error(e.message, originalRule.sourceInfo);
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    });
    originalRule.path = assembleFSHPath(parsedRule.path); // Assembling the separated rule path back into a normal string

    parsedRule.caretPath?.forEach((element: PathPart, elementIndex) => {
      // Caret path indexes should only be resolved in the context of a specific path
      // Each normal path has a separate map and max-index-map to keep track of the caret path indices
      if (!caretPathMap.has(originalRule.path)) {
        caretPathMap.set(originalRule.path, new Map());
      }
      if (!maxCaretPathMap.has(originalRule.path)) {
        maxCaretPathMap.set(originalRule.path, new Map());
      }

      const elementCaretPathMap = caretPathMap.get(originalRule.path);
      const elementMaxCaretPathMap = maxCaretPathMap.get(originalRule.path);
      // Add a prefix to the current element containing previously parsed rule elements
      element.prefix = assembleFSHPath(parsedRule.caretPath.slice(0, elementIndex));
      try {
        if (strict) {
          convertSoftIndicesStrict(element, elementCaretPathMap, elementMaxCaretPathMap);
        } else {
          convertSoftIndices(element, elementCaretPathMap);
        }
      } catch (e) {
        logger.error(e.message, originalRule.sourceInfo);
        if (e.stack) {
          logger.debug(e.stack);
        }
      }
    });

    // If a rule is a CaretValueRule, we assemble its caretPath as well
    if (originalRule instanceof CaretValueRule) {
      originalRule.caretPath = assembleFSHPath(parsedRule.caretPath);
    }
  });
}

/**
 * Given an id or path, collect all of the values at that path in a flattened array. This works
 * similar to FHIRPath path navigation, but has a few tweaks for our specific use case.
 */
export function collectValuesAtElementIdOrPath(idOrPath: string, object: InstanceDefinition) {
  const ignoredSliceRequirements: string[] = [];
  let values = [object];
  const parts = idOrPath.split('.');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Handle the initial resourceType part of the path, if applicable
    if (i === 0 && /^[A-Z]/.test(part)) {
      if (object.resourceType && part !== object.resourceType) {
        return { values: [], ignoredSliceRequirements: [] };
      } else {
        continue;
      }
    }
    // Find the base and optional slicename, ignoring reslices
    const [, base, , slice, reslice] = part.match(/^([^:]+)(:([^/]+)(\/.*)?)?$/);
    // If it's a non-type slice or a reslice of a type slice, remember it
    const isTypeSlice = slice && base.endsWith('[x]');
    if (reslice || (slice && !isTypeSlice)) {
      ignoredSliceRequirements.push(parts.slice(0, i + 1).join('.'));
    }
    // If it's a type slice, use the slicename, else use the base
    const prop = isTypeSlice ? slice : base;
    // Now collect results of this part of the path
    const newResults = [];
    for (const obj of values) {
      if (obj == null) {
        continue;
      } else if (obj[prop] !== undefined) {
        newResults.push(obj[prop]);
      } else if (prop.endsWith('[x]')) {
        const choiceBase = prop.slice(0, -3);
        const choiceProp = Object.keys(obj).find(k => k.startsWith(choiceBase));
        newResults.push(obj[choiceProp]);
      }
    }
    values = flatten(newResults);
  }

  // NOTE: we don't currently use ignoredSliceRequirements anyway, but I like to keep it so that
  // we don't forget that we ARE ignoring slice requirements (and maybe we'll need it someday).
  return { values, ignoredSliceRequirements };
}
