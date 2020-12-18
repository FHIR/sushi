import { PathPart } from '../fhirtypes';
import { splitOnPathPeriods } from '../fhirtypes/common';
import { Rule } from '../fshtypes/rules';

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
 * Replaces soft indexs in rule paths with corresponding numbers
 * @param {Rule[]} rules - An array of Rules
 */
export function resolveSoftIndexing(rules: Rule[]): void {
  const pathMap: Map<string, number> = new Map();

  // Parsing and sepearating rules by base name and bracket indexes
  const parsedRules = rules.map(rule => parseFSHPath(rule.path));

  // Replacing Soft indexes with numbers
  parsedRules.map(path => {
    path.forEach((element: PathPart) => {
      if (!pathMap.has(element.base)) {
        pathMap.set(element.base, 0);
        if (element.brackets && element.brackets.includes('+')) {
          element.brackets[0] = '0';
        }
      } else {
        if (element.brackets) {
          element.brackets.forEach((bracket: string, index: number) => {
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
      }
    });
  });

  // Converting individual elements into whole rule paths
  rules.forEach((rule, index) => {
    let joinedPath: string;
    parsedRules[index].forEach((element: PathPart) => {
      joinedPath = !joinedPath ? element.base : `${joinedPath}.${element.base}`;
      if (element.brackets) {
        element.brackets.forEach(bracket => {
          joinedPath += `[${bracket}]`;
        });
      }
    });
    rule.path = joinedPath;
  });
}
