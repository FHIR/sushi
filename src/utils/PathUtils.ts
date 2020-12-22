import { PathPart } from '../fhirtypes';
import { splitOnPathPeriods } from '../fhirtypes/common';
import { CaretValueRule, Rule } from '../fshtypes/rules';

/**
 * Parses a FSH Path into a more easily usable form
 * @param {string} fshPath - A syntactically valid path in FSH
 * @returns {PathPart[]} an array of PathParts that is easier to work with
 */
export function parseFSHPath(fshPath: string): PathPart[] {
  const pathParts: PathPart[] = [];
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
      pathParts.push({ base: fhirPathBase, brackets: brackets });
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
 * Replaces soft indexs in rule paths with corresponding numbers
 * @param {Rule[]} rules - An array of Rules
 */
export function resolveSoftIndexing(rules: Rule[]): void {
  const pathMap: Map<string, number> = new Map();
  const caretPathMap: Map<string, Map<string, number>> = new Map();

  // Parsing and separating rules by base name and bracket indexes
  const parsedRules = rules.map(rule => {
    const parsedPath: any = { path: parseFSHPath(rule.path) };
    // If we have a CaretValueRule, we'll need a second round of parsing for the caret path
    if (rule instanceof CaretValueRule) {
      parsedPath.caretPath = parseFSHPath(rule.caretPath);
    }
    return parsedPath;
  });

  // Replacing Soft indexes with numbers
  parsedRules.map(rule => {
    rule.path.forEach((element: PathPart) => {
      if (!pathMap.has(element.base)) {
        pathMap.set(element.base, 0);
        if (element.brackets?.includes('+')) {
          element.brackets[element.brackets.indexOf('+')] = '0';
        }
      } else {
        element.brackets?.forEach((bracket: string, index: number) => {
          if (bracket === '+') {
            const newIndex = pathMap.get(element.base) + 1;
            element.brackets[index] = newIndex.toString();
            pathMap.set(element.base, newIndex);
          } else if (bracket === '=') {
            const currentIndex = pathMap.get(element.base);
            element.brackets[index] = currentIndex.toString();
          }
        });
      }
    });
    rule.path = assembleFSHPath(rule.path); // Assembling the separated rule path back into a normal string

    rule.caretPath?.forEach((element: PathPart) => {
      // Caret path indexes should only be resolved in the context of a specific path
      // Each normal path has a separate map to keep track of the caret path indexes
      if (!caretPathMap.has(rule.path)) {
        const caretMap = new Map();
        caretPathMap.set(rule.path, caretMap);
      }

      const workingPathMap = caretPathMap.get(rule.path);
      if (!workingPathMap.has(element.base)) {
        workingPathMap.set(element.base, 0);
        if (element.brackets?.includes('+')) {
          element.brackets[element.brackets.indexOf('+')] = '0';
        }
      } else {
        element.brackets?.forEach((bracket: string, index: number) => {
          if (bracket === '+') {
            const newIndex = workingPathMap.get(element.base) + 1;
            element.brackets[index] = newIndex.toString();
            workingPathMap.set(element.base, newIndex);
          } else if (bracket === '=') {
            const currentIndex = workingPathMap.get(element.base);
            element.brackets[index] = currentIndex.toString();
          }
        });
      }
    });
    if (rule.caretPath) rule.caretPath = assembleFSHPath(rule.caretPath);
  });

  // Converting individual elements into whole rule paths
  rules.forEach((rule, index) => {
    rule.path = parsedRules[index].path;
    if (rule instanceof CaretValueRule) rule.caretPath = parsedRules[index].caretPath;
  });
}
