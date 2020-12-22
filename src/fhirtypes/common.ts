import { isEmpty, cloneDeep } from 'lodash';
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
  SdRule,
  CaretValueRule,
  AssignmentValueType
} from '../fshtypes/rules';
import {
  FshReference,
  Instance,
  SourceInfo,
  FshCode,
  Profile,
  Extension,
  RuleSet,
  FshValueSet,
  FshCodeSystem,
  Mapping,
  isAllowedRule
} from '../fshtypes';
import { FSHTank } from '../import';
import { Type, Fishable } from '../utils/Fishable';
import { logger, resolveSoftIndexing } from '../utils';
import { FHIRId, idRegex } from './primitiveTypes';

export function splitOnPathPeriods(path: string): string[] {
  return path.split(/\.(?![^\[]*\])/g); // match a period that isn't within square brackets
}

/**
 * This function sets an instance property of an SD or ED if possible
 * @param {StructureDefinition | ElementDefinition} - The instance to assign a value on
 * @param {string} path - The path to assign a value at
 * @param {any} value - The value to assign
 * @param {Fishable} fisher - A fishable implementation for finding definitions and metadata
 */
export function setPropertyOnDefinitionInstance(
  instance: StructureDefinition | ElementDefinition,
  path: string,
  value: any,
  fisher: Fishable
): void {
  const instanceSD = instance.getOwnStructureDefinition(fisher);
  const { assignedValue, pathParts } = instanceSD.validateValueAtPath(path, value, fisher);
  setImpliedPropertiesOnInstance(instance, instanceSD, [path], fisher);
  setPropertyOnInstance(instance, pathParts, assignedValue);
}

export function setImpliedPropertiesOnInstance(
  instanceDef: StructureDefinition | ElementDefinition | InstanceDefinition,
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
      // assignable descendents, and assignable descenendents of its parents. An assignable descendent is a 1..n direct child
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
        if (foundAssignedValue) {
          // Find how much the two paths overlap, for example, a.b.c, and a.b.d overlap for a.b
          let overlapIdx = 0;
          const elParts = element.id.split('.');
          const assocElParts = associatedEl.id.split('.');
          for (
            ;
            overlapIdx < elParts.length && elParts[overlapIdx] === assocElParts[overlapIdx];
            overlapIdx++
          );
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
          [finalPath, ...impliedPaths].forEach(ip => sdRuleMap.set(ip, foundAssignedValue));
        }
      }
    }
  });
  sdRuleMap.forEach((value, path) => {
    const { pathParts } = instanceOfStructureDefinition.validateValueAtPath(path, null, fisher);
    setPropertyOnInstance(instanceDef, pathParts, value);
  });
}

export function setPropertyOnInstance(
  instance: StructureDefinition | ElementDefinition | InstanceDefinition | ValueSet | CodeSystem,
  pathParts: PathPart[],
  assignedValue: any
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
            // Check if the instance already has a quantity element
            // Quantity elements are the only FHIR types with both a code and value
            if (current[key].hasOwnProperty('value') && assignedValue.hasOwnProperty('code')) {
              // Ensure that the existing value is not being overwritten
              assignedValue = {
                value: current[key].value,
                ...assignedValue
              };
            }
          }
          current[key] = assignedValue;
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
    const codeSystem = tank.fish(value.system, Type.CodeSystem);
    const codeSystemMeta = fisher.fishForMetadata(codeSystem?.name, Type.CodeSystem);
    if (codeSystem && codeSystemMeta) {
      clone = cloneDeep(rule);
      const assignedCode = getRuleValue(clone) as FshCode;
      assignedCode.system = codeSystemMeta.url;
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
 * @param {string => boolean} skipFn - A function that returns true if a property should not be traversed
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
 * @param {StructureDefinition | InstanceDefinition} resourceDef - The resource definition to clean
 * @param {string => boolean} skipFn - A function that returns true if a property should not be traversed
 */
export function cleanResource(
  resourceDef: StructureDefinition | InstanceDefinition,
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
 * Adds Mixin rules onto a Profile, Extension, or Instance
 * @param {Profile | Extension | Instance} fshDefinition - The definition to apply mixin rules on
 * @param {FSHTank} tank - The FSHTank containing the fshDefinition
 */
export function applyMixinRules(
  fshDefinition: Profile | Extension | Instance,
  tank: FSHTank
): void {
  if (fshDefinition.mixins.length > 0) {
    const insertString = fshDefinition.mixins.map(m => `* insert ${m}`).join('\n');
    logger.warn(
      'Use of the "Mixins" keyword is deprecated and will be removed in a future release. ' +
        'Instead, use the "insert" keyword, which can be placed anywhere in a list of rules to indicate ' +
        'the exact location rules should be inserted. The RuleSets added here with the "Mixin" keyword can ' +
        `be added with the "insert" keyword by adding the following rule(s):\n${insertString}`,
      fshDefinition.sourceInfo
    );
  }
  // Rules are added to beginning of rules array, so add the last mixin rules first
  const mixedInRules: SdRule[] = [];
  fshDefinition.mixins.forEach(mixinName => {
    const ruleSet = tank.fish(mixinName, Type.RuleSet) as RuleSet;
    if (ruleSet) {
      ruleSet.rules.forEach(r => {
        // Record source information of Profile/Extension/Instance on which Mixin is applied
        r.sourceInfo.appliedFile = fshDefinition.sourceInfo.file;
        r.sourceInfo.appliedLocation = fshDefinition.sourceInfo.location;
      });
      const rules = ruleSet.rules.filter(r => {
        if (fshDefinition instanceof Instance && !(r instanceof AssignmentRule)) {
          logger.error(
            'Rules applied by mixins to an instance must assign a value. Other rules are ignored.',
            r.sourceInfo
          );
          return false;
        }
        return true;
      });
      mixedInRules.push(...(rules as SdRule[]));
    } else {
      logger.error(`Unable to find definition for RuleSet ${mixinName}.`, fshDefinition.sourceInfo);
    }
  });
  fshDefinition.rules = [...mixedInRules, ...fshDefinition.rules];
}

/**
 * Adds insert rules onto a Profile, Extension, or Instance
 * @param fshDefinition - The definition to apply rules on
 * @param tank - The FSHTank containing the fshDefinition
 */
export function applyInsertRules(
  fshDefinition: Profile | Extension | Instance | FshValueSet | FshCodeSystem | Mapping | RuleSet,
  tank: FSHTank,
  seenRuleSets: string[] = []
): void {
  const expandedRules: Rule[] = [];
  resolveSoftIndexing(fshDefinition.rules);
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
      ruleSet.rules.forEach(ruleSetRule => {
        // On the import side, a rule that is intended to be a ValueSetConceptComponent can
        // be imported as a ConceptRule because the syntax is identical. If this is the case,
        // create a ValueSetConceptComponent that corr esponds to the ConceptRule, and use that
        if (fshDefinition instanceof FshValueSet && ruleSetRule instanceof ConceptRule) {
          if (ruleSetRule.definition != null) {
            logger.warn(
              'ValueSet concepts should not include a definition, only system, code, and display are supported. The definition will be ignored.',
              ruleSetRule.sourceInfo
            );
          }
          const relatedCode = new FshCode(
            ruleSetRule.code,
            ruleSetRule.system,
            ruleSetRule.display
          );
          ruleSetRule = new ValueSetConceptComponentRule(true);
          (ruleSetRule as ValueSetConceptComponentRule).concepts = [relatedCode];
        }
        ruleSetRule.sourceInfo.appliedFile = rule.sourceInfo.file;
        ruleSetRule.sourceInfo.appliedLocation = rule.sourceInfo.location;
        if (isAllowedRule(fshDefinition, ruleSetRule)) {
          expandedRules.push(ruleSetRule);
        } else {
          logger.error(
            `Rule of type ${ruleSetRule.constructor.name} cannot be applied to entity of type ${fshDefinition.constructor.name}`,
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
 * @returns {string} - The URL to use to refer to the FHIR entity
 */
export function getUrlFromFshDefinition(
  fshDefinition: Profile | Extension | FshValueSet | FshCodeSystem,
  canonical: string
): string {
  for (const rule of fshDefinition.rules) {
    if (rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url') {
      // this value should only be a string, but that might change at some point
      return rule.value.toString();
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
        `The string "${name}" does not represent a valid FHIR name. Valid names start with an upper-case ASCII letter ('A'..'Z') followed by any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9') and '_', with a length limit of 255 characters.`,
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
   * If the id is a valid name, sanitize it to a valid id and log a warning
   *
   * @param sourceInfo - The FSH file and location that specified the id
   */
  validateId(sourceInfo: SourceInfo) {
    let validId = idRegex.test(this.id);
    if (!validId && nameRegex.test(this.id)) {
      // A valid name can be turned into a valid id by replacing _ with - and slicing to 64 character limit
      const sanitizedId = this.id.replace(/_/g, '-').slice(0, 64);
      if (idRegex.test(sanitizedId)) {
        // Use the sanitized id, but warn the user to fix this
        logger.warn(
          `The string "${this.id}" represents a valid FHIR name but not a valid FHIR id. FHIR ids cannot contain "_" and can be at most 64 characters. The id will be exported as "${sanitizedId}". Avoid this warning by specifying a valid id directly using the "Id" keyword.`,
          sourceInfo
        );
        this.id = sanitizedId;
        validId = true;
      }
    }
    if (!validId) {
      logger.error(
        `The string "${this.id}" does not represent a valid FHIR id. FHIR ids may contain any combination of upper- or lower-case ASCII letters ('A'..'Z', and 'a'..'z'), numerals ('0'..'9'), '-' and '.', with a length limit of 64 characters.`,
        sourceInfo
      );
    }
  }
}
