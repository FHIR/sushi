import { isEmpty, cloneDeep, upperFirst, remove, isEqual, zip, isObjectLike, pull } from 'lodash';
import {
  StructureDefinition,
  PathPart,
  ElementDefinition,
  InstanceDefinition,
  ValueSet,
  CodeSystem,
  CodeSystemConcept
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
  FshEntity,
  Invariant
} from '../fshtypes';
import { FSHTank } from '../import';
import { Type, Fishable, Metadata } from '../utils/Fishable';
import { fishInTankBestVersion, logger } from '../utils';
import { buildSliceTree, calculateSliceTreeCounts } from './sliceTree';
import { InstanceExporter } from '../export';
import { MismatchedTypeError } from '../errors';

// List of Conformance and Terminology resources from http://hl7.org/fhir/R4/resourcelist.html
// and https://hl7.org/fhir/R5/resourcelist.html
export const CONFORMANCE_AND_TERMINOLOGY_RESOURCES = new Set([
  'CapabilityStatement',
  'CapabilityStatement2', // pre-release R5
  'StructureDefinition',
  'ImplementationGuide',
  'SearchParameter',
  'MessageDefinition',
  'OperationDefinition',
  'CompartmentDefinition',
  'StructureMap',
  'GraphDefinition',
  'ExampleScenario',
  'CodeSystem',
  'ValueSet',
  'ConceptMap',
  'ConceptMap2', // pre-release R5
  'NamingSystem',
  'TerminologyCapabilities'
]);

// characteristics are set using the structuredefinition-type-characteristics extension
export const TYPE_CHARACTERISTICS_EXTENSION =
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-type-characteristics';
// the allowed codes to use with that extension are in the type-characteristics-code code system.
export const TYPE_CHARACTERISTICS_CODE = 'http://hl7.org/fhir/type-characteristics-code';
export const LOGICAL_TARGET_EXTENSION =
  'http://hl7.org/fhir/tools/StructureDefinition/logical-target';
export const IMPOSE_PROFILE_EXTENSION =
  'http://hl7.org/fhir/StructureDefinition/structuredefinition-imposeProfile';

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
  if (!(instance instanceof CodeSystem || instance instanceof ValueSet)) {
    const knownSlices = determineKnownSlices(instanceSD, new Map([[path, { pathParts }]]), fisher);
    setImpliedPropertiesOnInstance(instance, instanceSD, [path], [], fisher, knownSlices);
  }
  setPropertyOnInstance(instance, pathParts, assignedValue, fisher);
}

/**
 * Adds placeholder elements with slice names to array elements on instance definition.
 * The placeholder elements to add are based on the paths in the rule map.
 * @param {StructureDefinition | ElementDefinition | InstanceDefinition} instanceDef - Instance to create slices on
 * @param {StructureDefinition} instanceOfStructureDefinition - Structure definition for instanceDef
 * @param {Map<string, { pathParts: PathPart[] }>} ruleMap - Contains the paths used in assignment rules on the instance
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 * Returns the path of the slice including the slice name and the quantity (the minimum or the greatest index of the
 * slice that is used in a rule) of the slice.
 */
export function createUsefulSlices(
  instanceDef: StructureDefinition | ElementDefinition | InstanceDefinition,
  instanceOfStructureDefinition: StructureDefinition,
  ruleMap: Map<string, { pathParts: PathPart[] }>,
  fisher: Fishable
): Map<string, number> {
  const knownSlices = new Map<string, number>();
  ruleMap.forEach(({ pathParts }, path) => {
    const nonNumericPath = path.replace(/\[[-+]?\d+\]/g, '');
    const element = instanceOfStructureDefinition.findElementByPath(nonNumericPath, fisher);
    if (element) {
      // go through the parts, and make sure that we have a useful index, and maybe a named slice
      let current: any = instanceDef;
      let currentPath = '';
      for (const [i, pathPart] of pathParts.entries()) {
        currentPath += `${currentPath ? '.' : ''}${pathPart.base}`;

        // If this is a primitive and the path continues to a nested element of the primitive,
        // then we need to look at the special property that starts with _ instead.
        let key: string;
        if (pathPart.primitive && i < pathParts.length - 1) {
          key = `_${pathPart.base}`;
        } else {
          key = pathPart.base;
        }
        const ruleIndex = getArrayIndex(pathPart);
        let effectiveIndex = ruleIndex;
        let sliceName: string;
        if (ruleIndex != null) {
          // If the array doesn't exist, create it
          if (pathPart.primitive) {
            current[pathPart.base] ??= [];
            current[`_${pathPart.base}`] ??= [];
          } else {
            current[key] ??= [];
          }
          sliceName = pathPart.brackets ? getSliceName(pathPart) : null;
          if (sliceName) {
            // Determine the path to the slice
            const slicePath = `${currentPath}[${sliceName.replace(/\//g, '][')}]`; // Include sliceName in the currentPath (which is a FSH path)
            knownSlices.set(slicePath, Math.max(ruleIndex + 1, knownSlices.get(slicePath) ?? 0));
            const sliceIndices: number[] = [];
            // Find the indices where slices are placed
            const sliceExtensionUrl = fisher.fishForMetadata(sliceName)?.url;
            current[pathPart.base]?.forEach((el: any, i: number) => {
              if (
                el?._sliceName === sliceName ||
                (isExtension(pathPart.base) && el?.url && el?.url === sliceExtensionUrl)
              ) {
                sliceIndices.push(i);
              }
            });
            /**
             * Convert the index in terms of the slice to the corresponding index in the overall array
             *
             * Consider an example:
             * * component[foo][0]
             * * component[foo][1]
             * * component[bar][0]
             * * component[foo][2]
             *
             * So if rule = component[foo][2]:
             * ruleIndex = 2
             * sliceIndices = [0, 1] (since we're processing component[foo][2])
             * key = "component"
             * current[key] = the array of component on the instance so far
             * So we should put the rule at the end of the component, which is effectiveIndex = 3
             */
            if (ruleIndex >= sliceIndices.length) {
              effectiveIndex = ruleIndex - sliceIndices.length + current[pathPart.base].length;
            } else {
              effectiveIndex = sliceIndices[ruleIndex];
            }
          } else {
            // This is an array entry that does not have a named slice (so a typical numeric index)
            knownSlices.set(
              currentPath,
              Math.max(effectiveIndex + 1, knownSlices.get(currentPath) ?? 0)
            );
          }
          if (pathPart.brackets != null) {
            currentPath += pathPart.brackets
              .filter(b => b !== '0')
              .map(b => `[${b}]`)
              .join('');
          }
          // If the index doesn't exist in the array, add it and lesser indices
          // Empty elements should be null, not undefined, according to https://www.hl7.org/fhir/json.html#primitive
          for (let j = 0; j <= effectiveIndex; j++) {
            if (
              j < current[key].length &&
              j === effectiveIndex &&
              current[key][effectiveIndex] == null
            ) {
              if (pathPart.primitive) {
                current[pathPart.base][effectiveIndex] = {};
                current[`_${pathPart.base}`][effectiveIndex] = {};
              } else {
                current[key][effectiveIndex] = {};
              }
            } else if (j >= current[key].length) {
              if (sliceName) {
                // _sliceName is used to later differentiate which slice an element represents
                if (pathPart.primitive) {
                  current[pathPart.base].push({ _sliceName: sliceName });
                  current[`_${pathPart.base}`].push({ _sliceName: sliceName });
                } else {
                  current[key].push({ _sliceName: sliceName });
                }
              } else if (j === effectiveIndex) {
                if (pathPart.primitive) {
                  current[pathPart.base].push({});
                  current[`_${pathPart.base}`].push({});
                } else {
                  current[key].push({});
                }
              } else {
                if (pathPart.primitive) {
                  current[pathPart.base].push(null);
                  current[`_${pathPart.base}`].push(null);
                } else {
                  current[key].push(null);
                }
              }
            }
          }
          // If it isn't the last element, move on
          if (i < pathParts.length - 1) {
            current = current[key][effectiveIndex];
          }
        } else if (i < pathParts.length - 1) {
          // if we're not dealing with an array element, just traverse the element tree.
          if (current[key] == null) {
            current[key] = {};
          }
          current = current[key];
        }
      }
    }
  });
  return knownSlices;
}

/**
 * Looks through the rules on an instance to determine what slices will be created
 * when the instance is exported.
 * Returns the path of the slice including the slice name and the quantity (the minimum or the greatest index of the
 * slice that is used in a rule) of the slice.
 */
export function determineKnownSlices(
  instanceOfStructureDefinition: StructureDefinition,
  ruleMap: Map<string, { pathParts: PathPart[] }>,
  fisher: Fishable
): Map<string, number> {
  const knownSlices = new Map<string, number>();
  ruleMap.forEach(({ pathParts }, path) => {
    const nonNumericPath = path.replace(/\[[-+]?\d+\]/g, '');
    const element = instanceOfStructureDefinition.findElementByPath(nonNumericPath, fisher);
    if (element) {
      // go through the parts, and make sure that we have a useful index, and maybe a named slice
      let currentPath = '';
      for (const pathPart of pathParts) {
        currentPath += `${currentPath ? '.' : ''}${pathPart.base}`;

        const ruleIndex = getArrayIndex(pathPart);
        let sliceName: string;
        if (ruleIndex != null) {
          sliceName = pathPart.brackets ? getSliceName(pathPart) : null;
          if (sliceName) {
            // Determine the path to the slice
            const slicePath = currentPath + `[${sliceName.replace(/\//g, '][')}]`; // Include sliceName in the currentPath (which is a FSH path)
            knownSlices.set(slicePath, Math.max(ruleIndex + 1, knownSlices.get(slicePath) ?? 0));
          } else {
            // This is an array entry that does not have a named slice (so a typical numeric index)
            knownSlices.set(
              currentPath,
              Math.max(ruleIndex + 1, knownSlices.get(currentPath) ?? 0)
            );
          }
          if (pathPart.brackets != null) {
            currentPath += pathPart.brackets
              .filter(b => b !== '0')
              .map(b => `[${b}]`)
              .join('');
          }
        }
      }
    }
  });
  return knownSlices;
}

type ElementTrace = {
  def: ElementDefinition;
  history: string[];
  ghost: boolean; // element won't appear on the instance but its fixed value may be needed
  requirementRoot: string;
};

/**
 * NOTE: There is a thorough explanation of this function in ./common-README.md
 * that will hopefully explain some of the intricacies of function.
 * Good luck out there.
 */
export function setImpliedPropertiesOnInstance(
  instanceDef: StructureDefinition | ElementDefinition | InstanceDefinition | CodeSystem | ValueSet,
  instanceOfStructureDefinition: StructureDefinition,
  paths: string[],
  assignedResourcePaths: string[],
  fisher: Fishable,
  knownSlices: Map<string, number> = new Map<string, number>(),
  manualSliceOrdering = false
) {
  // normalize reslice style to multiple brackets
  paths = paths.map(p => p.replace(/\//g, ']['));
  // Record the values implied by the structure definition in sdRuleMap
  const sdRuleMap: Map<string, any> = new Map();
  const requirementRoots: Map<string, string> = new Map();
  // implied values may be applicable to slices
  const assignedValueStorage: Map<string, any> = new Map();
  const topLevelElements = instanceOfStructureDefinition.elements[0].children(true);
  const elementsToCheck = topLevelElements.map(el => {
    let requirementRoot: string;
    if (el.min > 0) {
      requirementRoot = '';
    } else {
      requirementRoot = splitOnPathPeriods(el.id).pop();
      if (requirementRoot.includes('[x]') && el.type?.length === 1) {
        requirementRoot = requirementRoot.replace(/\[x].*/, upperFirst(el.type[0].code));
      }
      // normalize reslice style to multiple brackets
      requirementRoot = requirementRoot.replace(/:(.*)$/, '[$1]').replace(/\//g, '][');
    }
    return {
      def: el,
      history: [] as string[],
      ghost: false,
      requirementRoot
    } as ElementTrace;
  });
  const effectiveMins = new Map<string, number>();
  while (elementsToCheck.length > 0) {
    const currentElement = elementsToCheck.shift();
    let nextTracePart = splitOnPathPeriods(currentElement.def.id).slice(-1)[0];
    if (nextTracePart.includes('[x]') && currentElement.def.type?.length === 1) {
      // if the type slice exists, and we end with [x], don't change it. otherwise, change it.
      // if value[x] and value[x]:valueIdentifier exist:
      //   value[x] stays the same, value[x]:valueIdentifier changes to valueIdentifier
      // if value[x] exists, but no choice slices of value[x] exist, and value[x] has only one type
      //   change value[x] to valueType
      if (currentElement.def.sliceName || currentElement.def.getSlices().length === 0) {
        nextTracePart = nextTracePart.replace(
          /\[x].*/,
          upperFirst(currentElement.def.type[0].code)
        );
      }
    }
    // normalize reslice style to multiple brackets
    nextTracePart = nextTracePart.replace(/:(.*)$/, '[$1]').replace(/\//g, '][');
    const traceParts = [...currentElement.history, nextTracePart];
    const tracePath = traceParts.join('.');
    if (!effectiveMins.has(tracePath)) {
      const sliceTree = buildSliceTree(currentElement.def);
      let keyStart = currentElement.history.join('.');
      if (keyStart.length > 0) {
        keyStart += '.';
      }
      calculateSliceTreeCounts(sliceTree, knownSlices, keyStart);
      const visitList = [sliceTree];
      while (visitList.length > 0) {
        const next = visitList.shift();
        let traceKey = tracePath;
        // add the slice name for non-choice slices
        if (next.element.sliceName && !next.element.base.path.endsWith('[x]')) {
          traceKey += `[${next.element.sliceName.replace(/\//g, '][')}]`;
        }
        effectiveMins.set(traceKey, next.count);
        visitList.push(...next.children);
      }
    }
    const finalMin = effectiveMins.get(tracePath);
    // does a rule path match the trace path?
    const matchingRule = paths.find(p => p === tracePath || p.startsWith(tracePath + '.'));
    // check for assigned values regardless of this element's effective min,
    // since it may have required slices that will need to know about the assigned value
    const assignedValueKey = Object.keys(currentElement.def).find(
      k => k.startsWith('fixed') || k.startsWith('pattern')
    );
    let foundAssignedValue = cloneDeep(
      currentElement.def[assignedValueKey as keyof ElementDefinition]
    );
    const connectedElements = currentElement.def.findConnectedElements();
    if (foundAssignedValue == null) {
      // check assigned value storage
      foundAssignedValue = assignedValueStorage.get(currentElement.def.id);
    } else {
      // add to assigned value storage
      connectedElements.forEach(connectedEl => {
        assignedValueStorage.set(connectedEl.id, foundAssignedValue);
      });
    }
    // if our def has a min > 0, potentially update min on connected defs by reapplying our own cardinality
    if (currentElement.def.min > 0) {
      connectedElements.forEach(ce => {
        if (ce.min < currentElement.def.min && !ce.id.startsWith(currentElement.def.id)) {
          ce.constrainCardinality(currentElement.def.min, '');
          if (ce.children().length == 0) {
            ce.unfold(fisher);
          }
        }
      });
    }
    if (finalMin > 0) {
      if (foundAssignedValue != null && !currentElement.ghost) {
        let ip = tracePath;
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
            ip = null;
          }
        }
        if (ip) {
          // set it for each instance of this element
          for (let idx = 0; idx < finalMin; idx++) {
            const numericPath = ip + (idx > 0 ? `[${idx}]` : '');
            sdRuleMap.set(numericPath, foundAssignedValue);
            requirementRoots.set(numericPath, currentElement.requirementRoot);
          }
        }
      }
      // check the children for instance of this element
      const children = currentElement.def.children(true);
      // special handling: if our current element has no slice name, we need guarantee the defined minimum
      // this is the only place where we do this, in order to accomodate cases where some named slices already exist
      let existingSliceCount = 0;
      if (finalMin < currentElement.def.min && currentElement.def.sliceName == null) {
        // our final min was lowered by slices, so add that to our indices.
        const slicePaths = currentElement.def
          .getSlices()
          .map(el => `${tracePath}[${el.sliceName}]`);
        slicePaths.forEach(slicePath => {
          if (knownSlices.has(slicePath)) {
            existingSliceCount += knownSlices.get(slicePath);
          }
        });
      }
      for (let idx = 0; idx < finalMin; idx++) {
        const effectiveIdx = idx + existingSliceCount;
        const newHistory = traceParts.slice(-1)[0] + (effectiveIdx > 0 ? `[${effectiveIdx}]` : '');
        elementsToCheck.push(
          ...children.map(
            child =>
              ({
                def: child,
                history: [...currentElement.history, newHistory],
                ghost: currentElement.ghost,
                requirementRoot:
                  currentElement.def.min > idx
                    ? currentElement.requirementRoot
                    : [...currentElement.history, newHistory].join('.')
              } as ElementTrace)
          )
        );
      }
    } else if (matchingRule || currentElement.def.min > 0) {
      // the definition min could be > 0 when the final min is 0 if slices fill it all the way up
      if (matchingRule && foundAssignedValue != null && !currentElement.ghost) {
        sdRuleMap.set(tracePath, foundAssignedValue);
        requirementRoots.set(tracePath, currentElement.requirementRoot);
      }
      let children = currentElement.def.children(true);
      // if the matching rule assigns a resource, we don't need to dig into it any deeper
      if (children.length == 0 && !assignedResourcePaths.includes(matchingRule)) {
        currentElement.def.unfold(fisher);
        children = currentElement.def.children(true);
      }
      const newHistory = traceParts.slice(-1)[0];
      elementsToCheck.push(
        ...children.map(
          child =>
            ({
              def: child,
              history: [...currentElement.history, newHistory],
              ghost: matchingRule == null,
              requirementRoot:
                child.min > 0
                  ? currentElement.requirementRoot
                  : [...currentElement.history, newHistory].join('.')
            } as ElementTrace)
        )
      );
    }
  }

  // we mostly want to assign rules in the order we get them, with one exception:
  // a path must come before its ancestors.
  // so, we build a tree of paths where each node's children are paths that start with that node's path.
  // then, we traverse the tree depth-first, postfix order to get the correct order.
  // in most cases, nothing will change, but it can come up when assigning to both a sliced element and a specific slice,
  // especially when complex types like CodeableConcept get involved.

  const originalKeys = Array.from(sdRuleMap.keys());
  const rulePaths: PathNode[] = originalKeys.map(path => ({ path }));
  const pathTree = buildPathTree(rulePaths);
  const sortedRulePaths = traverseRulePathTree(pathTree);
  if (!manualSliceOrdering) {
    // This sort function simulates the original implementation of setImpliedPropertiesOnInstance
    sortedRulePaths.sort((a: string, b: string) => {
      const aRoot = requirementRoots.get(a);
      const bRoot = requirementRoots.get(b);
      if (aRoot === bRoot) {
        // the winner is whoever has more path overlap on the first rule appearance
        const firstRule = paths.find(path => path === aRoot || path.startsWith(`${aRoot}.`));
        if (firstRule != null) {
          const firstRuleSplit = splitOnPathPeriods(firstRule);
          const splitA = splitOnPathPeriods(a);
          const splitB = splitOnPathPeriods(b);
          for (const [firstPart, aPart, bPart] of zip(firstRuleSplit, splitA, splitB)) {
            if (firstPart == null) {
              return 0;
            }
            if (firstPart === aPart && firstPart !== bPart) {
              return -1;
            }
            if (firstPart !== aPart && firstPart === bPart) {
              return 1;
            }
            if (firstPart !== aPart && firstPart !== bPart) {
              return 0;
            }
          }
        }
        return 0;
      }
      // if one is an ancestor of the other, use whichever appears first in the list of rules.
      // if the first appearance is the same rule for both, use the deeper element first
      const firstA = paths.findIndex(path => path === aRoot || path.startsWith(`${aRoot}.`));
      const firstB = paths.findIndex(path => path === bRoot || path.startsWith(`${bRoot}.`));
      if (firstA === firstB) {
        return bRoot.length - aRoot.length;
      }
      // if a and b have different requirement roots, but neither is an ancestor of the other, use rule order
      return firstA - firstB;
    });
  }
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
      let key: string;
      if (pathPart.primitive && i < pathParts.length - 1) {
        key = `_${pathPart.base}`;
      } else {
        key = pathPart.base;
      }
      // If this part of the path indexes into an array, the index will be the last bracket
      let index = getArrayIndex(pathPart);
      let sliceName: string;
      if (index != null) {
        if (pathPart.primitive) {
          // we may need to create or update one or both arrays
          if (current[pathPart.base] == null) {
            current[pathPart.base] =
              current[`_${pathPart.base}`]?.map((x: any) =>
                x?._sliceName != null ? { _sliceName: x._sliceName } : null
              ) ?? [];
          }
          if (current[`_${pathPart.base}`] == null) {
            current[`_${pathPart.base}`] = current[pathPart.base].map((x: any) =>
              x?._sliceName != null ? { _sliceName: x._sliceName } : null
            );
          }
        } else if (current[key] == null) {
          // if the array doesn't exist, create it
          current[key] = [];
        }
        sliceName = getSliceName(pathPart);
        if (sliceName) {
          const sliceIndices: number[] = [];
          // Find the indices where slices are placed
          const sliceExtensionUrl = fisher.fishForMetadata(sliceName)?.url;
          current[pathPart.base]?.forEach((el: any, i: number) => {
            if (
              el?._sliceName === sliceName ||
              (isExtension(pathPart.base) && el?.url && el?.url === sliceExtensionUrl)
            ) {
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
            if (pathPart.primitive) {
              // a value may already exist on one of the arrays, so only assign an empty object if it is nullish
              current[pathPart.base][index] ??= {};
              current[`_${pathPart.base}`][index] ??= {};
            } else {
              current[key][index] = {};
            }
          } else if (j >= current[key].length) {
            if (sliceName) {
              // _sliceName is used to later differentiate which slice an element represents
              if (pathPart.primitive) {
                current[pathPart.base].push({ _sliceName: sliceName });
                current[`_${pathPart.base}`].push({ _sliceName: sliceName });
              } else {
                current[key].push({ _sliceName: sliceName });
              }
            } else if (j === index) {
              if (pathPart.primitive) {
                current[pathPart.base].push({});
                current[`_${pathPart.base}`].push({});
              } else {
                current[key].push({});
              }
            } else {
              if (pathPart.primitive) {
                current[pathPart.base].push(null);
                current[`_${pathPart.base}`].push(null);
              } else {
                current[key].push(null);
              }
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
          if (sliceName && typeof assignedValue !== 'object') {
            // When an assignedValue is a primitive but also a slice, we convert to an object so that
            // the sliceName field can be tracked on the object. The _primitive field marks the object
            // to later be converted back to a primitive by replaceField in cleanResource
            assignedValue = { assignedValue, _primitive: true };
          }
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
        // if not, is there an existing (potentially null) element that we can add attributes to, to make compatible?
        // if so, assign at that index.
        // if not, append
        const perfectMatch = current.some(currentElement => {
          return (
            currentElement != null &&
            Object.keys(assignedElement).every(assignedKey => {
              return isEqual(
                reversePrimitive(assignedElement[assignedKey]),
                reversePrimitive(currentElement[assignedKey])
              );
            })
          );
        });
        if (!perfectMatch) {
          const partialMatch = current.findIndex(currentElement => {
            return (
              currentElement == null ||
              Object.keys(assignedElement).every(assignedKey => {
                return (
                  currentElement[assignedKey] == null ||
                  isEqual(
                    reversePrimitive(assignedElement[assignedKey]),
                    reversePrimitive(currentElement[assignedKey])
                  )
                );
              })
            );
          });
          if (partialMatch > -1) {
            // we may have found a partial match at a null element. if so, create an empty object
            if (current[partialMatch] == null) {
              current[partialMatch] = {};
            }
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
 * Replaces a reference to an item by name or id with the correct relative path to that item.
 * Replaces a reference to a local code system by the url for that code system.
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
  const value = rule.value;
  if (value instanceof FshReference) {
    let type: string, id: string, instanceMeta: Metadata;
    // Prefer resolving to instances, so look them up first
    const instance = tank.fish(value.reference, Type.Instance) as Instance;
    if (instance) {
      instanceMeta = fisher.fishForMetadata(
        instance?.instanceOf,
        Type.Resource,
        Type.Logical,
        Type.Type,
        Type.Profile,
        Type.Extension
      );
      if (instanceMeta) {
        type = instanceMeta.sdType;
        id = instance.id;
      }
    }
    // If we didn't find an instance, check other definitions in the tank
    if (type == null) {
      const definition = tank.fish(
        value.reference,
        Type.Profile,
        Type.Extension,
        Type.Logical,
        Type.Resource,
        Type.CodeSystem,
        Type.ValueSet
      );
      if (definition) {
        if (
          definition instanceof Profile ||
          definition instanceof Extension ||
          definition instanceof Logical ||
          definition instanceof Resource
        ) {
          type = 'StructureDefinition';
        } else if (definition instanceof FshCodeSystem) {
          type = 'CodeSystem';
        } else if (definition instanceof FshValueSet) {
          type = 'ValueSet';
        }
        id = definition.id;
      }
    }
    // If we still didn't find anything, broaden the scope to everything
    if (type == null) {
      const fhir = fisher.fishForFHIR(
        value.reference,
        Type.Instance,
        Type.Profile,
        Type.Extension,
        Type.Logical,
        Type.Resource,
        Type.CodeSystem,
        Type.ValueSet
      );
      if (fhir && fhir.resourceType && fhir.id) {
        type = fhir.resourceType;
        id = fhir.id;
      }
    }
    if (type != null && id != null) {
      clone = cloneDeep(rule);
      const assignedReference = clone.value as FshReference;
      // Set the sdType which will be used for type-checking during assignment
      assignedReference.sdType = type;
      // Only replace references that are specified using name or id. Absolute URLs or
      // relative URLs w/ a type should be left as-is to allow the user more control.
      if (!value.reference.includes('/')) {
        assignedReference.reference = `${type}/${id}`;
      }
      // if type is a logical, it needs to have can-be-target characteristic.
      // the canBeTarget metadata value is only defined for logicals.
      const typeMeta = instanceMeta ?? fisher.fishForMetadata(type);
      if (typeMeta.canBeTarget === false) {
        logger.warn(
          `Referenced type ${typeMeta?.name ?? typeMeta?.id ?? type} for logical instance ${
            value.reference
          } does not specify that it can be the target of a reference.`,
          rule.sourceInfo
        );
      }
    } else {
      // if we still haven't found anything, there's one more possibility:
      // the reference includes a version, which it doesn't need.
      const firstPipe = value.reference.indexOf('|');
      if (firstPipe > -1) {
        logger.warn('Reference assignments should not include a version.', rule.sourceInfo);
        clone = cloneDeep(rule);
        (clone.value as FshReference).reference = value.reference.slice(0, firstPipe);
        clone = replaceReferences(clone, tank, fisher);
      }
    }
  } else if (value instanceof FshCode) {
    // the version on a CodeSystem resource is not the same as the system's actual version out in the world.
    // so, they don't need to match.
    const baseSystem = value.system?.split('|')[0];
    const codeSystemMeta = fisher.fishForMetadata(baseSystem, Type.CodeSystem);
    if (codeSystemMeta) {
      clone = cloneDeep(rule);
      const assignedCode = clone.value as FshCode;
      assignedCode.system = value.system.replace(/^[^|]+/, codeSystemMeta.url);

      // Find the code system using the returned metadata to avoid duplicate warnings if version mismatches
      const matchedCanonical = codeSystemMeta.url
        ? `${codeSystemMeta.url}${codeSystemMeta.version ? `|${codeSystemMeta.version}` : ''}`
        : value.system;
      const codeSystem = fishInTankBestVersion(
        tank,
        matchedCanonical,
        rule.sourceInfo,
        Type.CodeSystem
      );
      if (codeSystem && (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance)) {
        // if a local system was used, check to make sure the code is actually in that system
        listUndefinedLocalCodes(codeSystem, [assignedCode.code], tank, rule);
      }
    }
  }
  return clone ?? rule;
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
 * @returns {string} The sliceName for the path part
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

      // If the object[prop] was an array and all items were replaced by null using the replaceFn, get rid of the whole array
      if (Array.isArray(object[prop]) && object[prop].every((v: any) => v == null)) {
        delete object[prop];
      }

      // Since an array could have been deleted, the whole object[prop] could have ended up as empty.
      // So, check again if object[prop] matches the matchFn to see if the whole thing can be replaced using the replaceFn.
      if (matchFn(object, prop)) {
        replaceFn(object, prop);
      }
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
    const referenceUrl = containedResource.url;
    replaceField(
      resourceDef,
      (o, p) =>
        /(^|\.)reference$/.test(p) &&
        (o[p] === referenceString || (referenceUrl && o[p] === referenceUrl)),
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
    | Invariant
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
              // strip the leading # when adding to the hierarchy
              ruleSetRuleClone.hierarchy.unshift(...rule.pathArray.map(code => code.slice(1)));
            } else if (ruleSetRuleClone instanceof CaretValueRule) {
              ruleSetRuleClone.pathArray.unshift(...rule.pathArray);
            }
          }
          if (
            ruleSetRuleClone instanceof ConceptRule &&
            fshDefinition instanceof FshCodeSystem &&
            context
          ) {
            // ConceptRules should not have a path context, so if one exists, show an error.
            // The concept is still added to the CodeSystem.
            logger.error(
              'Do not insert a RuleSet at a path when the RuleSet adds a concept.',
              ruleSetRuleClone.sourceInfo
            );
          }
          expandedRules.push(ruleSetRuleClone);
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
 * A helper function used to determine the value of either an assignment rule or a caret value rule
 * @param fshDefinition  the FSH definition
 * @param assignmentRulePath the path of the assignment rule whose value we want
 * @param caretRulePath the path of the caret value rule whose value we want
 * @param caretRuleCaretPath the caret path of the caret value rule
 * @returns an object with the value set by either the assignment rule or the caret value rule, and whether or not the value represents an instance,
 * or undefined if neither rule is set on the definition
 */
function getValueFromFshRules(
  fshDefinition:
    | Profile
    | Extension
    | Logical
    | Resource
    | FshValueSet
    | FshCodeSystem
    | Instance
    | RuleSet
    | Mapping,
  assignmentRulePath: string,
  caretRulePath: string,
  caretRuleCaretPath: string
): { value: AssignmentValueType; isInstance: boolean } | undefined {
  const fshRules: Rule[] = fshDefinition.rules;
  if (fshDefinition instanceof Instance) {
    const assignmentRules = fshRules.filter(
      rule => rule instanceof AssignmentRule && rule.path === assignmentRulePath
    ) as AssignmentRule[];
    if (assignmentRules.length > 0) {
      const lastAssignmentRule = assignmentRules[assignmentRules.length - 1];
      return { value: lastAssignmentRule.value, isInstance: lastAssignmentRule.isInstance };
    }
  } else {
    const caretValueRules = fshRules.filter(
      rule =>
        rule instanceof CaretValueRule &&
        rule.path === caretRulePath &&
        rule.caretPath === caretRuleCaretPath
    ) as CaretValueRule[];
    if (caretValueRules.length > 0) {
      // Select last CaretValueRule with caretPath === caretRuleCaretPath because rules processing
      // ends up applying the last rule in the processing order
      const lastCaretValueRule = caretValueRules[caretValueRules.length - 1];
      return { value: lastCaretValueRule.value, isInstance: lastCaretValueRule.isInstance };
    }
  }
  return;
}

/**
 * Determines the formal FHIR URL to use to refer to this entity (for example when fishing).
 * If a caret value rule has been applied to the entity's url, use the value specified in that
 * rule. Otherwise, use the default url based on the configured canonical url.
 * Since a string should always be assigned here, only return the rule value if it is a string
 * and not an Instance.
 *
 * @param fshDefinition - The FSH definition that the returned URL refers to
 * @param canonical - The canonical URL for the FSH project
 * @returns The URL to use to refer to the FHIR entity
 */
export function getUrlFromFshDefinition(
  fshDefinition: Profile | Extension | Logical | Resource | FshValueSet | FshCodeSystem | Instance,
  canonical: string
): string {
  const urlFromFshRules = getValueFromFshRules(fshDefinition, 'url', '', 'url');
  if (typeof urlFromFshRules?.value === 'string' && !urlFromFshRules?.isInstance) {
    return urlFromFshRules.value.toString();
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
 * Determines the version of this entity.
 * If a caret value rule has been applied to the entity's version, use the value specified in that
 * rule. Otherwise, use the default version based on the configured version from the tank.
 * Since a string should always be assigned here, only return the rule value if it is a string
 * and not an Instance.
 *
 * @param fshDefinition - The FSH definition whose version is being determined
 * @param canonical - The version for the FSH project
 * @returns The version of the FHIR entity
 */
export function getVersionFromFshDefinition(
  fshDefinition: Profile | Extension | Logical | Resource | FshValueSet | FshCodeSystem | Instance,
  version: string
): string {
  const versionFromFshRules = getValueFromFshRules(fshDefinition, 'version', '', 'version');
  if (typeof versionFromFshRules?.value === 'string' && !versionFromFshRules.isInstance) {
    return versionFromFshRules.value.toString();
  }

  return version;
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

/**
 * Use the raw value from a CaretValueRule to try to find an Instance to assign.
 * This is useful in cases where the Instance id is numeric or boolean.
 */
export function validateInstanceFromRawValue(
  target: CodeSystem | ValueSet,
  rule: CaretValueRule,
  instanceExporter: InstanceExporter,
  fisher: Fishable,
  originalErr: MismatchedTypeError
): { instance: InstanceDefinition; pathParts: PathPart[] } {
  const instance = instanceExporter.fishForFHIR(rule.rawValue);
  if (instance == null) {
    logger.error(originalErr.message, rule.sourceInfo);
    if (originalErr.stack) {
      logger.debug(originalErr.stack);
    }
  } else {
    try {
      const targetSD = target.getOwnStructureDefinition(fisher);
      const path = rule.path.length > 1 ? `${rule.path}.${rule.caretPath}` : rule.caretPath;
      const { pathParts } = targetSD.validateValueAtPath(path, instance, fisher);
      return { instance, pathParts };
    } catch (instanceErr) {
      if (instanceErr instanceof MismatchedTypeError) {
        logger.error(originalErr.message, rule.sourceInfo);
        if (originalErr.stack) {
          logger.debug(originalErr.stack);
        }
      } else {
        logger.error(instanceErr.message, rule.sourceInfo);
        if (instanceErr.stack) {
          logger.debug(instanceErr.stack);
        }
      }
    }
  }
  return { instance: null, pathParts: [] };
}

/**
 * Make a deep clone recursively, adding properties in the order expected for exported JSON.
 * If a list of keys is provided, use those properties from the input.
 * Otherwise, use all properties from the input.
 *
 * @param input - the value to clone
 * @param keys - optionally, the properties of the value to include in the clone, defaults to input keys if not specified
 * @returns {any} - a clone of the input, with reordered properties
 */
export function orderedCloneDeep(input: any, keys?: string[]): any {
  // non-objects should be cloned normally
  // arrays should get a recursive call on their elements, but don't need reordering
  if (!isObjectLike(input)) {
    return cloneDeep(input);
  } else if (Array.isArray(input)) {
    return input.map(element => orderedCloneDeep(element));
  } else {
    if (keys == null) {
      keys = Object.keys(input);
    }
    const underscoreKeys = remove(keys, key => key.startsWith('_'));
    const orderedKeys: string[] = [];
    const result: any = {};

    keys.forEach(key => {
      orderedKeys.push(key);
      if (underscoreKeys.includes(`_${key}`)) {
        orderedKeys.push(`_${key}`);
        pull(underscoreKeys, `_${key}`);
      }
    });
    underscoreKeys.forEach(key => {
      orderedKeys.push(key);
    });

    orderedKeys.forEach(key => {
      result[key] = orderedCloneDeep(input[key]);
    });

    return result;
  }
}

export function getAllConcepts(cs: { concept?: CodeSystemConcept[] }): string[] {
  const allConcepts: string[] = [];
  if (cs.concept == null) {
    return allConcepts;
  }
  const conceptList = [...cs.concept];
  while (conceptList.length > 0) {
    const nextConcept = conceptList.shift();
    allConcepts.push(nextConcept.code);
    if (nextConcept.concept != null) {
      conceptList.unshift(...nextConcept.concept);
    }
  }
  return allConcepts;
}

/**
 * Find the profiles declared as impose profiles via the imposeProfile extension.
 * @param sd - the StructureDefinition to extract imposeProfiles from
 * @returns - a list of impose profile URLs or undefined if there are none
 */
export function findImposeProfiles(sd: any): string[] | undefined {
  const imposeProfiles = sd?.extension
    ?.filter((ext: any) => ext?.url === IMPOSE_PROFILE_EXTENSION && ext.valueCanonical != null)
    .map((ext: any) => ext.valueCanonical);
  if (imposeProfiles?.length) {
    return imposeProfiles;
  }
}
