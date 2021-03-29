import { PathPart } from '../fhirtypes';
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
    const splitPathPart = pathPart.split('[');
    if (splitPathPart.length === 1 || pathPart.endsWith('[x]')) {
      // There are no brackets, or the brackets are for a choice, so just push on the name
      pathParts.push({ base: pathPart });
    } else {
      // We have brackets, let's  save the bracket info
      let fhirPathBase = splitPathPart[0];
      // Get the bracket elements and slice off the trailing ']'
      let brackets = splitPathPart.slice(1).map(s => s.slice(0, -1));
      // Get rid of any remaining [x] elements in the brackets
      if (brackets[0] === 'x') {
        fhirPathBase += '[x]';
        brackets = brackets.slice(1);
      }
      brackets.forEach(bracket => {
        if (!indexRegex.test(bracket) && !(bracket === '+' || bracket === '=')) {
          seenSlices.push(bracket);
        }
      });
      if (seenSlices.length > 0) {
        pathParts.push({
          base: fhirPathBase,
          brackets: brackets,
          slices: seenSlices
        });
      } else {
        pathParts.push({ base: fhirPathBase, brackets: brackets });
      }
    }
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
 *
 * @param {PathPart} element - A single element in a rules path
 * @param {Map<string, number} pathMap - A map containing an element's name as the key and that element's updated index as the value
 */
function convertSoftIndexes(element: PathPart, pathMap: Map<string, number>) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;
  if (!pathMap.has(mapName)) {
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
 * Replaces soft indexs in rule paths with corresponding numbers
 * @param {Rule[]} rules - An array of Rules
 */
export function resolveSoftIndexing(rules: Array<Rule | CaretValueRule>): void {
  const pathMap: Map<string, number> = new Map();
  const caretPathMap: Map<string, Map<string, number>> = new Map();

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
        convertSoftIndexes(element, pathMap);
      } catch (e) {
        logger.error(e.message, originalRule.sourceInfo);
      }
    });
    originalRule.path = assembleFSHPath(parsedRule.path); // Assembling the separated rule path back into a normal string

    parsedRule.caretPath?.forEach((element: PathPart, elementIndex) => {
      // Caret path indexes should only be resolved in the context of a specific path
      // Each normal path has a separate map to keep track of the caret path indexes
      if (!caretPathMap.has(originalRule.path)) {
        caretPathMap.set(originalRule.path, new Map());
      }

      const elementCaretPathMap = caretPathMap.get(originalRule.path);
      // Add a prefix to the current element containing previously parsed rule elements
      element.prefix = assembleFSHPath(parsedRule.caretPath.slice(0, elementIndex));
      try {
        convertSoftIndexes(element, elementCaretPathMap);
      } catch (e) {
        logger.error(e.message, originalRule.sourceInfo);
      }
    });

    // If a rule is a CaretValueRule, we assemble its caretPath as well
    if (originalRule instanceof CaretValueRule) {
      originalRule.caretPath = assembleFSHPath(parsedRule.caretPath);
    }
  });
}
