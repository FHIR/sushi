import {
  isEmpty,
  cloneDeep,
  upperFirst,
  remove,
  isEqual,
  sumBy,
  zip,
  zipWith,
  slice
} from 'lodash';
import {
  StructureDefinition,
  PathPart,
  ElementDefinition,
  InstanceDefinition,
  ValueSet,
  CodeSystem
} from '.';
import {
  AssignmentRule,
  Rule,
  InsertRule,
  ConceptRule,
  ValueSetConceptComponentRule,
  CaretValueRule,
  AssignmentValueType
} from '../fshtypes/rules';
import {
  FshReference,
  Instance,
  FshCode,
  Logical,
  Profile,
  Extension,
  RuleSet,
  FshValueSet,
  FshCodeSystem,
  Mapping,
  isAllowedRule,
  Resource,
  FshEntity
} from '../fshtypes';
import { FSHTank } from '../import';
import { Type, Fishable } from '../utils/Fishable';
import { assembleFSHPath, logger, parseFSHPath } from '../utils';

export function splitOnPathPeriods(path: string): string[] {
  return path.split(/\.(?![^\[]*\])/g); // match a period that isn't within square brackets
}

/**
 * This function sets an instance property of a resource if possible
 * @param {StructureDefinition | ElementDefinition | CodeSystem | ValueSet} instance - The instance to assign a value on
 * @param {string} path - The path to assign a value at
 * @param {any} value - The value to assign
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 */
export function setPropertyOnDefinitionInstance(
  instance: StructureDefinition | ElementDefinition | CodeSystem | ValueSet,
  path: string,
  value: any,
  fisher: Fishable
): void {
  const instanceSD = instance.getOwnStructureDefinition(fisher);
  const { assignedValue, pathParts } = instanceSD.validateValueAtPath(path, value, fisher);
  setImpliedPropertiesOnInstance(instance, instanceSD, [path], fisher);
  setPropertyOnInstance(instance, pathParts, assignedValue, fisher);
}

export function setImpliedPropertiesOnInstance(
  instanceDef: StructureDefinition | ElementDefinition | InstanceDefinition | CodeSystem | ValueSet,
  instanceOfStructureDefinition: StructureDefinition,
  paths: string[],
  fisher: Fishable
) {
  // Record the values implied by the structure definition in sdRuleMap
  const sdRuleMap: Map<string, any> = new Map();
  paths.forEach(path => {
    const nonNumericPath = path.replace(/\[[-+]?\d+\]/g, '');
    const element = instanceOfStructureDefinition.findElementByPath(nonNumericPath, fisher);
    if (element) {
      // If an element is pointed to by a path, that means we must assign values on its parents, its own
      // assignable descendents, and assignable descendents of its parents. An assignable descendent is a 1..n direct child
      // or an assignable descendent of such a child
      const parents = element.getAllParents();
      const associatedElements = [...element.getAssignableDescendents(), ...parents];
      parents.map(p => p.getAssignableDescendents()).forEach(pd => associatedElements.push(...pd));

      for (const associatedEl of associatedElements) {
        const assignedValueKey = Object.keys(associatedEl).find(
          k => k.startsWith('fixed') || k.startsWith('pattern')
        );
        const foundAssignedValue = cloneDeep(
          associatedEl[assignedValueKey as keyof ElementDefinition]
        );
        if (foundAssignedValue != null) {
          // Find how much the two paths overlap, for example, a.b.c, and a.b.d overlap for a.b
          let overlapIdx = 0;
          const elParts = element.id.split('.');
          const assocElParts = associatedEl.id.split('.');
          for (; overlapIdx < elParts.length && overlapIdx < assocElParts.length; overlapIdx++) {
            // If an associated path applies to all choices (e.g., value[x]), and the element path
            // is a specific choice (e.g., value[x]:valueQuantity), then treat it as a match
            const [elPart, assocElPart] = [elParts[overlapIdx], assocElParts[overlapIdx]];
            if (assocElPart.endsWith('[x]') && elPart.startsWith(`${assocElPart}:`)) {
              continue;
            } else if (elPart !== assocElPart) {
              break;
            }
          }
          // We must keep the relevant portion of the beginning of path to preserve sliceNames
          // and combine this with portion of the associatedEl's path that is not overlapped
          const pathStart = splitOnPathPeriods(path).slice(0, overlapIdx - 1);
          const pathEnd = associatedEl
            .diffId()
            .split('.')
            .slice(overlapIdx)
            // Replace FHIR slicing with FSH slicing, a:b.c:d -> a[b].c[d]
            .map(r => r.replace(/(\S):(\S+)/, (match, c1, c2) => `${c1}[${c2}]`));
          const finalPath = [...pathStart, ...pathEnd].join('.');
          const impliedPaths = getAllImpliedPaths(
            associatedEl,
            // Implied paths are found via the index free path
            finalPath.replace(/\[[-+]?\d+\]$/g, '')
          );
          const allPaths = [finalPath, ...impliedPaths];
          // Transform paths such that any required reslices may be satisfied by existing slices
          // const elementWithSlices = associatedEl.slicedElement() ?? associatedEl;
          // const allSlices = elementWithSlices.getSlices();
          const parents = associatedEl.getAllParents().slice(0, -1).reverse(); // [oldest ancestor, ... grandparent, parent]
          const allRequiredSlices = parents.map(parent => {
            const elementWithSlices = parent.slicedElement() ?? parent;
            const slices = elementWithSlices.getSlices();
            // parent's effective min (min for element with that path) = parent's - (all slices that start with "parent's name/")
            const effectiveMins = slices.map(
              slice =>
                slice.min -
                sumBy(
                  slices.filter(s => s.sliceName.startsWith(`${slice.sliceName}/`)),
                  'min'
                )
            );
            const slicesWithMins = zipWith(slices, effectiveMins, (a, b) => ({
              sliceName: a.sliceName,
              min: b
            }));
            // TODO sort slicesWithMins so that ex. Bread/Wheat comes before Bread ??
            return slicesWithMins;
          });

          const newAndImprovedAllPaths = allPaths.map(path => {
            const parts = parseFSHPath(path);
            // for each part in parts, check if it has any required slices
            // if it does, check my slice name and numeric index (if my index doesn't exist, it's 0)
            // see if i need to turn into something with a different slice name
            // IMPORTANT reslices should get priority over their base slice. so Bread/Rye comes before Bread
            // i promise to be nice
            // Anything we need to do applying to the last path part is handled by getAllImpliedPaths
            const result = zip(parts.slice(0, -1), allRequiredSlices).map(([part, sliceFacts]) => {
              if (sliceFacts.length > 0) {
                const mySliceName = part.slices ? getSliceName(part) : ''; //.slices?.join('/') ?? '';
                let myNumericIndex = getArrayIndex(part) ?? 0;
                for (const fact of sliceFacts) {
                  if (fact.sliceName.startsWith(mySliceName) && fact.min > myNumericIndex) {
                    // fact.sliceName is my new slice name
                    part.brackets = fact.sliceName.split('/');
                    part.slices = fact.sliceName.split('/');
                    // myNumericIndex is my new index
                    if (myNumericIndex > 0) {
                      part.brackets.push(myNumericIndex.toString());
                    }
                    break;
                  } else if (fact.sliceName.startsWith(mySliceName)) {
                    myNumericIndex -= fact.min;
                  }
                }
              }
              return part;
            });
            result.push(parts.pop()); // Get the last path part that we sliced off when building result
            const newPath = assembleFSHPath(result);
            return newPath;
          });

          newAndImprovedAllPaths.forEach(ip => {
            // Don't let any non-constrained choice paths (e.g., value[x]) through since instances
            // must specify a particular choice (i.e., value[x] is not a valid path in an instance)
            if (/\[x]/.test(ip)) {
              // Fix any single-type choices to be type-specific (e.g., value[x] -> valueString)
              const parts = splitOnPathPeriods(ip);
              for (let i = 0; i < parts.length; i++) {
                if (parts[i].endsWith('[x]')) {
                  const partEl = instanceOfStructureDefinition.findElementByPath(
                    parts.slice(0, i + 1).join('.'),
                    fisher
                  );
                  if (partEl?.type?.length === 1) {
                    parts[i] = parts[i].replace('[x]', upperFirst(partEl.type[0].code));
                  }
                }
              }
              ip = parts.join('.');
              // If there is still a [x], we couldn't fix it, so skip it
              if (/\[x]/.test(ip)) {
                return; // out of the forEach of implied paths
              }
            }
            sdRuleMap.set(ip, foundAssignedValue);
          });
        }
      }
    }
  });

  // we mostly want to assign rules in the order we get them, with one exception:
  // a path must come before its ancestors.
  // so, we build a tree of paths where each node's children are paths that start with that node's path.
  // then, we traverse the tree depth-first, postfix order to get the correct order.
  // in most cases, nothing will change, but it can come up when assigning to both a sliced element and a specific slice,
  // especially when complex types like CodeableConcept get involved.

  const rulePaths: PathNode[] = Array.from(sdRuleMap.keys()).map(path => ({ path }));
  const pathTree = buildPathTree(rulePaths);
  const sortedRulePaths = traverseRulePathTree(pathTree);
  sortedRulePaths.forEach(path => {
    const { pathParts } = instanceOfStructureDefinition.validateValueAtPath(path, null, fisher);
    setPropertyOnInstance(instanceDef, pathParts, sdRuleMap.get(path), fisher);
  });
}

type PathNode = {
  path: string;
  children?: PathNode[];
};

function buildPathTree(paths: PathNode[]) {
  const topLevelChildren: PathNode[] = [];
  paths.forEach(p => insertIntoTree(topLevelChildren, p));
  return topLevelChildren;
}

function insertIntoTree(currentElements: PathNode[], el: PathNode) {
  // if we find something that could be this element's parent, we traverse downwards
  const parent = currentElements.find(current => el.path.startsWith(current.path));
  if (parent != null) {
    insertIntoTree(parent.children, el);
  } else {
    // otherwise, we will add at the current level
    // the current level could contain elements that should be the new element's children
    const children = remove(currentElements, current => current.path.startsWith(el.path));
    el.children = children;
    currentElements.push(el);
  }
}

function traverseRulePathTree(elements: PathNode[]): string[] {
  const result: string[] = [];
  elements.forEach(el => {
    result.push(...traverseRulePathTree(el.children));
    result.push(el.path);
  });
  return result;
}

export function setPropertyOnInstance(
  instance: StructureDefinition | ElementDefinition | InstanceDefinition | ValueSet | CodeSystem,
  pathParts: PathPart[],
  assignedValue: any,
  fisher: Fishable
): void {
  if (assignedValue != null) {
    // If we can assign the value on the StructureDefinition StructureDefinition, then we can set the
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
          if (typeof assignedValue !== 'object') {
            // When an assignedValue is a primitive but also a slice, we convert to an object so that
            // the sliceName field can be tracked on the object. The _primitive field marks the object
            // to later be converted back to a primitive by replaceField in cleanResource
            assignedValue = { assignedValue, _primitive: true };
          }
          const sliceIndices: number[] = [];
          // Find the indices where slices are placed
          const sliceExtensionUrl = fisher.fishForMetadata(sliceName)?.url;
          current[pathPart.base]?.forEach((el: any, i: number) => {
            if (el?._sliceName === sliceName || (el?.url && el?.url === sliceExtensionUrl)) {
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
          if (typeof assignedValue === 'object') {
            Object.assign(current[key][index], assignedValue);
          } else {
            current[key][index] = assignedValue;
          }
        }
      } else {
        // If it isn't the last element, move on, if it is, set the value
        if (i < pathParts.length - 1) {
          if (current[key] == null) current[key] = {};
          current = current[key];
        } else {
          // Check if the instance already has the element being defined
          if (current[key] != null && typeof current[key] === 'object') {
            // If the instance already has the element, we should merge it
            // Cases where this applies:
            // - Quantity elements that set a value and then set a code with the FSH code syntax
            // - Reference elements that set other properties of reference (like identifier) directly
            //   and set reference with the FSH Reference() keyword
            // We have to be a little careful when assigning, in case array values are contained in the object
            assignComplexValue(current[key], assignedValue);
          } else {
            current[key] = assignedValue;
          }
        }
      }
    }
  }
}

function assignComplexValue(current: any, assignedValue: any) {
  // checking that current is an array is a little redundant, but is useful for the type checker
  if (Array.isArray(assignedValue) && Array.isArray(current)) {
    // for each element of assignedValue, make a compatible element on current
    for (const assignedElement of assignedValue) {
      if (typeof assignedElement !== 'object') {
        // if assignedElement is not an object:
        // is there an existing element that is equal?
        // if so, we're good
        // if not, append
        if (
          !current.some((currentElement: any) => {
            return (
              (typeof currentElement === 'object' &&
                currentElement._primitive === true &&
                currentElement.assignedValue === assignedValue) ||
              currentElement === assignedElement
            );
          })
        ) {
          current.push(assignedElement);
        }
      } else {
        // if assignedElement is an object:
        // is there an existing element that has all the attributes?
        // if so, we're good.
        // if not, is there an existing element that we can add attributes to, to make compatible?
        // if so, assign at that index.
        // if not, append
        const perfectMatch = current.some(currentElement => {
          return Object.keys(assignedElement).every(assignedKey => {
            return isEqual(
              reversePrimitive(assignedElement[assignedKey]),
              reversePrimitive(currentElement[assignedKey])
            );
          });
        });
        if (!perfectMatch) {
          const partialMatch = current.findIndex(currentElement => {
            return Object.keys(assignedElement).every(assignedKey => {
              return (
                currentElement[assignedKey] == null ||
                isEqual(
                  reversePrimitive(assignedElement[assignedKey]),
                  reversePrimitive(currentElement[assignedKey])
                )
              );
            });
          });
          if (partialMatch > -1) {
            assignComplexValue(current[partialMatch], assignedElement);
          } else {
            current.push(assignedElement);
          }
        }
      }
    }
  } else {
    // assignedValue is a non-array object,
    // so assign recursively
    for (const key of Object.keys(assignedValue)) {
      if (typeof assignedValue[key] === 'object') {
        if (current[key] == null) {
          if (Array.isArray(assignedValue[key])) {
            current[key] = [];
          } else {
            current[key] = {};
          }
        }
        assignComplexValue(current[key], assignedValue[key]);
      } else {
        if (typeof current[key] === 'object' && current[key]._primitive === true) {
          current[key].assignedValue = assignedValue[key];
        } else {
          current[key] = assignedValue[key];
        }
      }
    }
  }
}

// turn an assigned-primitive back into its primitive value
// if and only if it has no other properties
function reversePrimitive(element: any): any {
  if (
    typeof element === 'object' &&
    element._primitive === true &&
    Object.keys(element).includes('assignedValue') &&
    Object.keys(element).length === 2
  ) {
    return element.assignedValue;
  } else {
    return element;
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
 * @param {AssignmentRule} rule - The rule to replace references on
 * @param {FSHTank} tank - The tank holding the instances and code systems
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 * @returns {AssignmentRule} a clone of the rule if replacing is done, otherwise the original rule
 */
export function replaceReferences<T extends AssignmentRule | CaretValueRule>(
  rule: T,
  tank: FSHTank,
  fisher: Fishable
): T {
  let clone: T;
  const value = getRuleValue(rule);
  if (value instanceof FshReference) {
    const instance = tank.fish(value.reference, Type.Instance) as Instance;
    const instanceMeta = fisher.fishForMetadata(
      instance?.instanceOf,
      Type.Resource,
      Type.Logical,
      Type.Type,
      Type.Profile,
      Type.Extension
    );
    // If we can't find a matching instance, just leave the reference as is
    if (instance && instanceMeta) {
      // If the instance has a rule setting id, that overrides instance.id
      const idRule = instance.rules.find(
        r => r.path === 'id' && r instanceof AssignmentRule
      ) as AssignmentRule;
      const id = idRule?.value ?? instance.id;
      clone = cloneDeep(rule);
      const assignedReference = getRuleValue(clone) as FshReference;
      assignedReference.reference = `${instanceMeta.sdType}/${id}`;
      assignedReference.sdType = instanceMeta.sdType;
    }
  } else if (value instanceof FshCode) {
    const [system, ...versionParts] = value.system?.split('|') ?? [];
    const version = versionParts.join('|');
    const codeSystem = tank.fish(system, Type.CodeSystem);
    const codeSystemMeta = fisher.fishForMetadata(codeSystem?.name, Type.CodeSystem);
    if (
      codeSystem &&
      (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance) &&
      codeSystemMeta
    ) {
      clone = cloneDeep(rule);
      const assignedCode = getRuleValue(clone) as FshCode;
      assignedCode.system = `${codeSystemMeta.url}${version ? `|${version}` : ''}`;
      // if a local system was used, check to make sure the code is actually in that system
      listUndefinedLocalCodes(codeSystem, [assignedCode.code], tank, rule);
    }
  }
  return clone ?? rule;
}

/**
 * Function to get a value from a rule that has a value (AssignedValue or CaretValue)
 * @param rule - The rule to get a value from
 * @returns - The value on the rule
 */
function getRuleValue(rule: AssignmentRule | CaretValueRule): AssignmentValueType {
  if (rule instanceof AssignmentRule) {
    return rule.value;
  } else if (rule instanceof CaretValueRule) {
    return rule.value;
  }
}

export function listUndefinedLocalCodes(
  codeSystem: FshCodeSystem | Instance,
  codes: string[],
  tank: FSHTank,
  sourceEntity: FshEntity
): void {
  let undefinedCodes: string[] = [];
  applyInsertRules(codeSystem, tank);
  const conceptRulePath = /^(concept(\[\s*(\d+|\+|=)\s*\])?\.)+code$/;
  // if the CodeSystem content is complete, a code not present in this system should be listed as undefined.
  // if the CodeSystem content is not complete, then do not list any code as undefined.
  // in a FshCodeSystem, content is complete by default, so make sure it isn't set to something else.
  // in an Instance, content does not have a default value, so make sure there is a rule that sets it to complete.
  if (
    codeSystem instanceof FshCodeSystem &&
    !codeSystem.rules.some(
      rule =>
        rule instanceof CaretValueRule &&
        rule.path === '' &&
        rule.caretPath === 'content' &&
        rule.value instanceof FshCode &&
        rule.value.code !== 'complete'
    )
  ) {
    // a concept may have been added by a ConceptRule or by a CaretValueRule.
    // while ConceptRule is strongly preferred, CaretValueRule is still allowed.
    undefinedCodes = codes.filter(code => {
      return !codeSystem.rules.some(
        rule =>
          (rule instanceof ConceptRule && rule.code === code) ||
          (rule instanceof CaretValueRule &&
            rule.path === '' &&
            conceptRulePath.test(rule.caretPath) &&
            rule.value instanceof FshCode &&
            rule.value.code === code)
      );
    });
  } else if (
    codeSystem instanceof Instance &&
    codeSystem.usage == 'Definition' &&
    codeSystem.rules.some(
      rule =>
        rule instanceof AssignmentRule &&
        rule.path === 'content' &&
        rule.value instanceof FshCode &&
        rule.value.code === 'complete'
    )
  ) {
    undefinedCodes = codes.filter(code => {
      return !codeSystem.rules.some(
        rule =>
          rule instanceof AssignmentRule &&
          conceptRulePath.test(rule.path) &&
          rule.value instanceof FshCode &&
          rule.value.code === code
      );
    });
  }
  if (undefinedCodes.length > 0) {
    logger.error(
      `Code${undefinedCodes.length > 1 ? 's' : ''} ${undefinedCodes
        .map(code => `"${code}"`)
        .join(', ')} ${undefinedCodes.length > 1 ? 'are' : 'is'} not defined for system ${
        codeSystem.name
      }.`,
      sourceEntity.sourceInfo
    );
  }
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
 * @param {(object: { [key: string]: any }, prop: string) => boolean} skipFn - A function that returns true if a property should not be traversed
 */
export function replaceField(
  object: { [key: string]: any },
  matchFn: (object: { [key: string]: any }, prop: string) => boolean,
  replaceFn: (object: { [key: string]: any }, prop: string) => void,
  skipFn: (prop: string) => boolean
): void {
  for (const prop in object) {
    if (matchFn(object, prop)) {
      replaceFn(object, prop);
    } else if (typeof object[prop] === 'object' && !skipFn(prop)) {
      replaceField(object[prop], matchFn, replaceFn, skipFn);
    }
  }
}

/**
 * Cleans up temporary properties that were added to the resource definition during processing
 * @param {StructureDefinition | InstanceDefinition | CodeSystem | ValueSet} resourceDef - The resource definition to clean
 * @param {string => boolean} skipFn - A function that returns true if a property should not be traversed
 */
export function cleanResource(
  resourceDef: StructureDefinition | InstanceDefinition | CodeSystem | ValueSet,
  skipFn: (prop: string) => boolean = () => false
): void {
  // Remove all _sliceName fields
  replaceField(
    resourceDef,
    (o, p) => p === '_sliceName',
    (o, p) => delete o[p],
    skipFn
  );
  // Change any {} to null
  replaceField(
    resourceDef,
    (o, p) => typeof o[p] === 'object' && o[p] !== null && isEmpty(o[p]),
    (o, p) => (o[p] = null),
    skipFn
  );

  // Change back any primitives that have been converted into objects by setPropertyOnInstance
  replaceField(
    resourceDef,
    (o, p) => typeof o[p] === 'object' && o[p] !== null && o[p]._primitive,
    (o, p) => (o[p] = o[p].assignedValue),
    skipFn
  );

  // Update references to any contained resources to be #id instead of resourceType/id
  resourceDef.contained?.forEach((containedResource: any) => {
    const referenceString = `${containedResource.resourceType}/${containedResource.id}`;
    replaceField(
      resourceDef,
      (o, p) => o[p] === referenceString,
      (o, p) => (o[p] = `#${containedResource.id}`),
      skipFn
    );
  });
}

/**
 * Adds insert rules onto a Profile, Extension, or Instance
 * @param fshDefinition - The definition to apply rules on
 * @param tank - The FSHTank containing the fshDefinition
 */
export function applyInsertRules(
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | Instance
    | FshValueSet
    | FshCodeSystem
    | Mapping
    | RuleSet,
  tank: FSHTank,
  seenRuleSets: string[] = []
): void {
  const expandedRules: Rule[] = [];
  fshDefinition.rules.forEach(rule => {
    if (!(rule instanceof InsertRule)) {
      expandedRules.push(rule);
      return;
    }

    const ruleSetIdentifier = JSON.stringify([rule.ruleSet, ...rule.params]);
    let ruleSet: RuleSet;
    if (rule.params.length) {
      ruleSet = tank.fishForAppliedRuleSet(ruleSetIdentifier);
    } else {
      ruleSet = tank.fish(rule.ruleSet, Type.RuleSet) as RuleSet;
    }

    if (ruleSet) {
      if (seenRuleSets.includes(ruleSetIdentifier)) {
        logger.error(
          `Inserting ${ruleSet.name} will cause a circular dependency, so the rule will be ignored`,
          rule.sourceInfo
        );
        return;
      }
      // RuleSets may contain other RuleSets via insert rules on themselves, so before applying the rules
      // from a RuleSet, we must first recursively expand any insert rules on that RuleSet
      applyInsertRules(ruleSet, tank, [...seenRuleSets, ruleSetIdentifier]);
      let context = rule.path;
      let firstRule = true;
      ruleSet.rules.forEach(ruleSetRule => {
        ruleSetRule.sourceInfo.appliedFile = rule.sourceInfo.file;
        ruleSetRule.sourceInfo.appliedLocation = rule.sourceInfo.location;
        // On the import side, there are some rules that syntactically match both ConceptRule and
        // ValueSetConceptComponentRule. When this happens, a ConceptRule is created with a value
        // set on its system. If we are applying rules to a ValueSet, and the ConceptRule has a
        // system, create a ValueSetConceptComponent that corresponds to the ConceptRule, and use that.
        // BUT! If we have a ConceptRule with a system, and we are applying rules to a CodeSystem,
        // log an error to let the author know to not do that.
        if (ruleSetRule instanceof ConceptRule && ruleSetRule.system) {
          if (fshDefinition instanceof FshValueSet) {
            const relatedCode = new FshCode(
              ruleSetRule.code,
              ruleSetRule.system,
              ruleSetRule.display
            );
            ruleSetRule = new ValueSetConceptComponentRule(true);
            (ruleSetRule as ValueSetConceptComponentRule).concepts = [relatedCode];
          } else if (fshDefinition instanceof FshCodeSystem) {
            logger.error(
              'Do not include the system when listing concepts for a code system.',
              ruleSetRule.sourceInfo
            );
          }
        }
        if (isAllowedRule(fshDefinition, ruleSetRule)) {
          const ruleSetRuleClone = cloneDeep(ruleSetRule);
          if (context) {
            let newPath = context;
            if (ruleSetRuleClone?.path === '.') {
              logger.error(
                "The special '.' path is only allowed in top-level rules. The rule will be processed as if it is not indented.",
                ruleSetRule.sourceInfo
              );
              newPath = ruleSetRuleClone.path;
            } else if (ruleSetRuleClone.path) {
              newPath += `.${ruleSetRuleClone.path}`;
            }
            ruleSetRuleClone.path = newPath;
          }
          if (rule.pathArray.length > 0) {
            if (ruleSetRuleClone instanceof ConceptRule) {
              ruleSetRuleClone.hierarchy.unshift(...rule.pathArray);
            } else if (ruleSetRuleClone instanceof CaretValueRule) {
              ruleSetRuleClone.pathArray.unshift(...rule.pathArray);
            }
          }
          if (ruleSetRuleClone instanceof ConceptRule && fshDefinition instanceof FshCodeSystem) {
            // ConceptRules should not have a path context, so if one exists, show an error.
            // The concept is still added to the CodeSystem.
            if (context) {
              logger.error(
                'Do not insert a RuleSet at a path when the RuleSet adds a concept.',
                ruleSetRuleClone.sourceInfo
              );
            }
            try {
              if (fshDefinition.checkConcept(ruleSetRuleClone)) {
                expandedRules.push(ruleSetRuleClone);
              }
            } catch (e) {
              logger.error(e.message, ruleSetRuleClone.sourceInfo);
            }
          } else {
            expandedRules.push(ruleSetRuleClone);
          }
          if (firstRule) {
            // Once one rule has been applied, all future rules should inherit the index used on that rule
            // rather than continuing to increment the index with the [+] operator
            context = context.replace(/\[\+\]/g, '[=]');
            firstRule = false;
          }
        } else {
          logger.error(
            `Rule of type ${ruleSetRule.constructorName} cannot be applied to entity of type ${fshDefinition.constructorName}`,
            ruleSetRule.sourceInfo
          );
        }
      });
    } else {
      logger.error(`Unable to find definition for RuleSet ${rule.ruleSet}.`, rule.sourceInfo);
    }
  });
  fshDefinition.rules = expandedRules;
}

/**
 * Finds all FSH paths implied by the FSH path pointing at element. Paths are implied by array elements.
 * For example, if foo is 2..* and bar is 2..*, and bar has a assigned value of "hello", then the rule
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
    const nextPath = splitOnPathPeriods(path)
      .slice(0, -1)
      .join('.')
      .replace(/\[[-+]?\d+\]$/g, '');
    if (parent.min === 0) {
      // If the parent has min = 0, then the path above this point has no additional implied paths
      // so add the path to this point to the parentPaths
      parentPaths.push(nextPath);
    } else {
      // If min >= 1, the parent or its parents my have implied paths, recursively find those
      parentPaths.push(...getAllImpliedPaths(parent, nextPath));
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

/**
 * Determines the formal FHIR URL to use to refer to this entity (for example when fishing).
 * If a caret value rule has been applied to the entity's url, use the value specified in that
 * rule. Otherwise, use the default url based on the configured canonical url.
 *
 * @param fshDefinition - The FSH definition that the returned URL refers to
 * @param canonical - The canonical URL for the FSH project
 * @returns The URL to use to refer to the FHIR entity
 */
export function getUrlFromFshDefinition(
  fshDefinition: Profile | Extension | Logical | Resource | FshValueSet | FshCodeSystem | Instance,
  canonical: string
): string {
  const fshRules: Rule[] = fshDefinition.rules;
  if (fshDefinition instanceof Instance) {
    const assignmentRules = fshRules.filter(
      rule =>
        rule instanceof AssignmentRule && rule.path === 'url' && typeof rule.value === 'string'
    ) as AssignmentRule[];
    if (assignmentRules.length > 0) {
      const lastAssignmentRule = assignmentRules[assignmentRules.length - 1];
      return lastAssignmentRule.value.toString();
    }
  } else {
    const caretValueRules = fshRules.filter(
      rule => rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url'
    ) as CaretValueRule[];
    if (caretValueRules.length > 0) {
      // Select last CaretValueRule with caretPath === 'url' because rules processing
      // ends up applying the last rule in the processing order
      const lastCaretValueRule = caretValueRules[caretValueRules.length - 1];
      // this value should only be a string, but that might change at some point
      return lastCaretValueRule.value.toString();
    }
  }

  let fhirType: string;
  if (fshDefinition instanceof FshValueSet) {
    fhirType = 'ValueSet';
  } else if (fshDefinition instanceof FshCodeSystem) {
    fhirType = 'CodeSystem';
  } else {
    fhirType = 'StructureDefinition';
  }
  return `${canonical}/${fhirType}/${fshDefinition.id}`;
}

/**
 * Determines the formal FHIR type to use to define to this entity for logical models and
 * resources. The type for profiles and extension should not be changed. If a caret value
 * rule has been applied to the entity's type, use the value specified in that rule.
 * Otherwise, use the appropriate default based on the fshDefinition.
 *
 * @param fshDefinition - The FSH definition (Logical or Resource) that the returned type refers to
 * @param parentSD - The parent StructureDefinition for the fshDefinition
 * @returns The type to specify in the StructureDefinition for this fshDefinition
 */
export function getTypeFromFshDefinitionOrParent(
  fshDefinition: Profile | Extension | Logical | Resource,
  parentSD: StructureDefinition
): string {
  if (fshDefinition instanceof Profile || fshDefinition instanceof Extension) {
    return parentSD.type;
  }

  const fshRules: Rule[] = fshDefinition.rules;
  const caretValueRules = fshRules.filter(
    rule => rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'type'
  ) as CaretValueRule[];
  if (caretValueRules.length > 0) {
    // Select last CaretValueRule with caretPath === 'type' because rules processing
    // ends up applying the last rule in the processing order
    const lastCaretValueRule = caretValueRules[caretValueRules.length - 1];
    // this value should only be a string, but that might change at some point
    return lastCaretValueRule.value.toString();
  }

  // Default type for logical model to the StructureDefinition url;
  // otherwise default to the id meta property.
  // Ref: https://chat.fhir.org/#narrow/pm-with/191469,210024,211704,239822-group/near/240237602
  return fshDefinition instanceof Logical ? parentSD.url : fshDefinition.id;
}

export function isExtension(path: string): boolean {
  return ['modifierExtension', 'extension'].includes(path);
}

export function isModifierExtension(extension: any): boolean {
  return (
    extension?.snapshot.element.find((el: ElementDefinition) => el.id === 'Extension')
      ?.isModifier === true
  );
}

/**
 * Checks if a provided type can be treated as a Reference
 * @param type - The type being checked
 * @returns - True if the type can be treated as a reference, false otherwise
 */
export function isReferenceType(type: string): boolean {
  return ['Reference', 'CodeableReference'].includes(type);
}
