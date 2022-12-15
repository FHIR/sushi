import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, InstanceDefinition, ElementDefinition, PathPart } from '../fhirtypes';
import { Instance, SourceInfo } from '../fshtypes';
import { logger, Fishable, Type, Metadata, resolveSoftIndexing, assembleFSHPath } from '../utils';
import {
  setPropertyOnInstance,
  replaceReferences,
  cleanResource,
  splitOnPathPeriods,
  applyInsertRules,
  isExtension,
  getSliceName,
  isModifierExtension,
  createUsefulSlices,
  determineKnownSlices,
  setImpliedPropertiesOnInstance
} from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import { InstanceOfLogicalProfileError } from '../errors/InstanceOfLogicalProfileError';
import { Package } from '.';
import { cloneDeep, merge, padEnd, uniq, upperFirst } from 'lodash';
import { AssignmentRule, PathRule } from '../fshtypes/rules';
import chalk from 'chalk';

export class InstanceExporter implements Fishable {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: Fishable
  ) {}

  /**
   * Checks if there exist Instances of Custom Resources, which are not supported
   * by the IG Publisher and are therefore not included in the IG.
   */
  private warnOnInstanceOfCustomResource(): void {
    const instancesOfCustomResource = this.pkg.instances.filter(instance =>
      this.pkg.resources.some(r => r.type === instance.resourceType)
    );
    if (instancesOfCustomResource.length) {
      // logger.warn color
      const clr = chalk.rgb(179, 98, 0);
      const maxLength = 61;
      const instancesOfCustomResourceLogs = instancesOfCustomResource.map(r => {
        const printableName = r.id.length > maxLength ? r.id.slice(0, maxLength - 3) + '...' : r.id;
        return clr('│') + padEnd(` - ${printableName}`, 65) + clr('│');
      });

      // prettier-ignore
      const message = [
          clr('\n╭─────────────────────────────────────────────────────────────────') + '' + clr('╮'),
            clr('│') + ' Detected the following instance(s) of custom resources:         ' + clr('│'),
            ...instancesOfCustomResourceLogs,
            clr('│') + '                                                                 ' + clr('│'),
            clr('│') + " Since non-conformant resources and their instances aren't       " + clr('│'),
            clr('│') + ' supported by standard FHIR tooling, these instances will        ' + clr('│'),
            clr('│') + ' not be included in the generated IG resource.                   ' + clr('│'),
            clr('╰─────────────────────────────────────────────────────────────────') + '' + clr('╯\n')
        ];
      logger.warn(message.join('\n'));
    }
  }

  private setAssignedValues(
    fshInstanceDef: Instance,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ): InstanceDefinition {
    const manualSliceOrdering = this.tank.config.instanceOptions?.manualSliceOrdering ?? false;

    // The fshInstanceDef.rules list may contain insert rules, which will be expanded to AssignmentRules
    applyInsertRules(fshInstanceDef, this.tank);
    resolveSoftIndexing(fshInstanceDef.rules, manualSliceOrdering);
    let rules = fshInstanceDef.rules
      .filter(r => !(r instanceof PathRule)) // Don't do anything with path rules
      .map(r => cloneDeep(r)) as AssignmentRule[];
    // Normalize all rules to not use the optional [0] index
    rules.forEach(r => {
      r.path = r.path.replace(/\[0+\]/g, '');
    });
    rules = rules.map(r => replaceReferences(r, this.tank, this.fisher));
    // Convert strings in AssignmentRules to instances
    rules = rules.filter(r => {
      if (r.isInstance) {
        const instance: InstanceDefinition = this.fishForFHIR(r.value as string);
        if (instance != null) {
          r.value = instance;
          return true;
        } else {
          logger.error(
            `Cannot find definition for Instance: ${r.value}. Skipping rule.`,
            r.sourceInfo
          );
          return false;
        }
      }
      return true;
    });
    // Collect all paths that indicate the sub-paths of that path should be of a given resourceType
    // for example, if a.b = SomePatientInstance, then any subpath (a.b.x) must ensure that when validating
    // Patient is used for the type of a.b
    const inlineResourcePaths: { path: string; instanceOf: string }[] = [];
    rules.forEach(r => {
      if (r.isInstance && r.value instanceof InstanceDefinition) {
        inlineResourcePaths.push({
          path: r.path,
          // We only use the first element of the meta.profile array, if a need arises for a more
          // comprehensive approach, we can come back to this later
          instanceOf: r.value.meta?.profile?.[0] ?? r.value.resourceType
        });
      }
      if (r.path.endsWith('.resourceType') && typeof r.value === 'string') {
        inlineResourcePaths.push({
          // Only get the part of the path before resourceType, aka if path is a.b.resourceType
          // the relevant element is a.b, since it is the actual Resource element
          path: splitOnPathPeriods(r.path).slice(0, -1).join('.'),
          instanceOf: r.value
        });
      }
    });

    // When assigning values, things happen in the order:
    // 1 - Validate values for rules that are on the instance
    // 2 - Determine all rules implied by the Structure Definition
    // 3 - Set values from rules implied by the Structure Definition
    // 4 - Set values from rules directly on the instance
    // This order is required due to the fact that validateValueAtPath changes instanceOfStructureDefinition
    // in certain cases that must happen before setting rules from the Structure Definition. In the future
    // we may want to refactor validateValueAtPath, but for now things should happen in this order
    const ruleMap: Map<
      string,
      { pathParts: PathPart[]; assignedValue: any; sourceInfo: SourceInfo }
    > = new Map();
    rules.forEach(rule => {
      try {
        const matchingInlineResourcePaths = inlineResourcePaths.filter(
          i => rule.path.startsWith(`${i.path}.`) && rule.path !== `${i.path}.resourceType`
        );
        // Generate an array of resourceTypes that matches the path, so if path is
        // a.b.c.d.e, and b is a Bundle and D is a Patient,
        // inlineResourceTypes = [undefined, "Bundle", undefined, "Patient", undefined]
        const inlineResourceTypes: string[] = [];
        matchingInlineResourcePaths.forEach(match => {
          inlineResourceTypes[splitOnPathPeriods(match.path).length - 1] = match.instanceOf;
        });
        // if a rule has choice elements in the path that are constrained to a single type,
        // change the path to reflect the available type for each choice element.
        // if the path changes, warn the user that it is a better idea to use the more specific element name
        const updatedPath = instanceOfStructureDefinition.updatePathWithChoices(rule.path);
        if (rule.path !== updatedPath) {
          logger.warn(
            `When assigning values on instances, use the choice element's type. Rule path changed from '${rule.path}' to '${updatedPath}'.`,
            rule.sourceInfo
          );
          rule.path = updatedPath;
        }
        const validatedRule = instanceOfStructureDefinition.validateValueAtPath(
          rule.path,
          rule.value,
          this.fisher,
          inlineResourceTypes,
          rule.sourceInfo,
          manualSliceOrdering
        );
        // Record each valid rule in a map
        // Choice elements on an instance must use a specific type, so if the path still has an unchosen choice element,
        // the rule can't be used. See http://hl7.org/fhir/R4/formats.html#choice
        if (validatedRule.pathParts.some(part => part.base.endsWith('[x]'))) {
          logger.error(
            `Unable to assign value at ${rule.path}: choice elements on an instance must use a specific type`,
            rule.sourceInfo
          );
        } else {
          ruleMap.set(rule.path, {
            pathParts: validatedRule.pathParts,
            assignedValue: validatedRule.assignedValue,
            sourceInfo: rule.sourceInfo
          });
        }
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });

    const paths = [
      '',
      ...rules.map(rule =>
        assembleFSHPath(ruleMap.get(rule.path)?.pathParts ?? []).replace(/\[0\]/g, '')
      )
    ];
    // To correctly assign properties, we need to:
    // 1 - Create useful slices for rules so that properties are assigned in the correct places in arrays
    // 2 - Assign implied properties on the original instance
    // 3 - Assign rule properties on a copy of the result of 2, so that rule assignment can build on implied assignment
    // 4 - Merge the result of 3 with the result of 2, so that any implied properties which may have been overwritten
    //     in step 3 are maintained...don't worry I'm confused too
    let knownSlices: Map<string, number>;
    if (manualSliceOrdering) {
      knownSlices = createUsefulSlices(
        instanceDef,
        instanceOfStructureDefinition,
        ruleMap,
        this.fisher
      );
    } else {
      // Don't create slices, just determine what will be created later
      knownSlices = determineKnownSlices(instanceOfStructureDefinition, ruleMap, this.fisher);
    }
    setImpliedPropertiesOnInstance(
      instanceDef,
      instanceOfStructureDefinition,
      paths,
      inlineResourcePaths.map(p => p.path),
      this.fisher,
      knownSlices,
      manualSliceOrdering
    );
    const ruleInstance = cloneDeep(instanceDef);
    ruleMap.forEach(rule => {
      setPropertyOnInstance(ruleInstance, rule.pathParts, rule.assignedValue, this.fisher);
      // was an instance of an extension used correctly with respect to modifiers?
      if (
        isExtension(rule.pathParts[rule.pathParts.length - 1].base) &&
        typeof rule.assignedValue === 'object'
      ) {
        const extension = this.fisher.fishForFHIR(rule.assignedValue.url, Type.Extension);
        if (extension) {
          const pathBase = rule.pathParts[rule.pathParts.length - 1].base;
          const isModifier = isModifierExtension(extension);
          if (isModifier && pathBase === 'extension') {
            logger.error(
              `Instance of modifier extension ${
                extension.name ?? extension.id
              } assigned to extension path. Modifier extensions should only be assigned to modifierExtension paths.`,
              rule.sourceInfo
            );
          } else if (!isModifier && pathBase === 'modifierExtension') {
            logger.error(
              `Instance of non-modifier extension ${
                extension.name ?? extension.id
              } assigned to modifierExtension path. Non-modifier extensions should only be assigned to extension paths.`,
              rule.sourceInfo
            );
          }
        }
      }
      // were extensions used correctly along the path?
      rule.pathParts.forEach(pathPart => {
        if (isExtension(pathPart.base)) {
          const sliceName = getSliceName(pathPart);
          if (sliceName) {
            const extension = this.fisher.fishForFHIR(sliceName, Type.Extension);
            if (extension) {
              const isModifier = isModifierExtension(extension);
              if (isModifier && pathPart.base === 'extension') {
                logger.error(
                  `Modifier extension ${
                    extension.name ?? extension.id
                  } used on extension element. Modifier extensions should only be used with modifierExtension elements.`,
                  rule.sourceInfo
                );
              } else if (!isModifier && pathPart.base === 'modifierExtension') {
                logger.error(
                  `Non-modifier extension ${
                    extension.name ?? extension.id
                  } used on modifierExtension element. Non-modifier extensions should only be used with extension elements.`,
                  rule.sourceInfo
                );
              }
            }
          }
        }
      });
    });
    instanceDef = merge(instanceDef, ruleInstance);
    return instanceDef;
  }

  /**
   * Check that all required elements are present on an InstanceDefinition or
   * a sub-part of an InstanceDefinition for all children of an element.
   * An element is required if it has minimum cardinality greater than 1.
   * @param {{[key: string]: any}} instance - The InstanceDefinition or subsection of an InstanceDefinition we are validating
   * @param {ElementDefinition} element - The element we are trying to validate all children of
   * @param {Instance} fshDefinition - The FSH definition that we built the original InstanceDefinition from
   */
  private validateRequiredChildElements(
    instance: { [key: string]: any },
    element: ElementDefinition,
    fshDefinition: Instance
  ): void {
    // Get only direct children of the element
    const children = element.children(true);
    children.forEach(c => {
      let child = c;
      // Get the last part of the path, A.B.C => C
      const childPathEnd = child.path.split('.').slice(-1)[0];
      // Note that in most cases the _ prefixed element will not exist. But if it does exist, we validate
      // using the _ prefixed element, since it will contain any children of the primitive
      let instanceChild = instance[`_${childPathEnd}`] ?? instance[childPathEnd];
      // If the element is a choice, we will fail to find it, we need to use the choice name
      if (instanceChild == null && childPathEnd.endsWith('[x]')) {
        const possibleChoiceSlices = [...children];
        element
          .findConnectedElements()
          .forEach(ce => possibleChoiceSlices.push(...ce.children(true)));
        const choiceSlices = possibleChoiceSlices.filter(c => c.path === child.path && c.sliceName);
        for (const choiceSlice of choiceSlices) {
          // as above, we use the _ prefixed element if it exists
          instanceChild = instance[`_${choiceSlice.sliceName}`] ?? instance[choiceSlice.sliceName];
          const splitChoicePath = splitOnPathPeriods(choiceSlice.id);
          // If the element we're assigning to has a sliceName, use it to ensure that we're validating
          // against the correct choice slice
          if (
            instanceChild != null &&
            (instance._sliceName
              ? splitChoicePath[splitChoicePath.length - 2].split(':')[1] === instance._sliceName
              : true)
          ) {
            // Once we find the the choiceSlice that matches, use it as the child
            child = choiceSlice;
            break;
          }
        }
        // If we don't have instanceChild yet, it may be due to a rule that refers to a named slice using a numeric index somewhere in the path.
        // AssignmentRules on an Instance cause elements to be unfolded on the InstanceOf StructureDefinition, because that
        // allows the AssignmentRule's value to be validated.
        // But, if the rule on the Instance didn't have a slice name, the element without a slice name is the one
        // that gets unfolded.
        // So, if we're currently on a part of the Instance that does have a slice name, try to find the ElementDefinition
        // that has the same path.
        // This gets a little confusing to read because we're also dealing with choice elements here, which are handled as
        // sliced elements, hence why we want the slice name of the child element to match: because that means it represents
        // the choice type that we want.
        // All of this confusion arises because the author used a numeric slice index instead of a slice name,
        // so warn the user that it is preferable to use the slice name whenever possible.
        // Eventually, this logic can be removed when array indexing no longer allows the author to refer to
        // a named slice using a numeric index.
        if (instanceChild == null) {
          const namelessChoiceSlices =
            element
              .findConnectedSliceElement()
              ?.children(true)
              .filter(c => c.path === child.path && c.sliceName) ?? [];
          for (const choiceSlice of namelessChoiceSlices) {
            instanceChild = instance[choiceSlice.sliceName];
            if (instanceChild != null) {
              // Once we find the the choiceSlice that matches, use it as the child, but warn the user about their rule-writing
              logger.warn(
                `Element ${child.id} has its cardinality satisfied by a rule that does not include the slice name. Use slice names in rule paths when possible.`
              );
              child = choiceSlice;
              break;
            }
          }
        }
        // If we still haven't found it, it's possible that a type slice just wasn't created. In that case, there would
        // be a type in the choice element's type array that would be a match if it were type-sliced.
        if (instanceChild == null) {
          for (const type of child.type) {
            const name = childPathEnd.replace(/\[x\]$/, upperFirst(type.code));
            instanceChild = instance[`_${name}`] ?? instance[name];
            if (instanceChild != null) {
              break;
            }
          }
        }
      }
      // Recursively validate children of the current element
      if (Array.isArray(instanceChild)) {
        // If the child is a slice, and there are no array elements with matching slice names
        // but there are array elements that could match (since they use numerical indices)
        // we can go no further in validation, since we can't know which slice is represented
        if (
          child.sliceName &&
          !instanceChild.find((arrayEl: any) => arrayEl?._sliceName === child.sliceName) &&
          instanceChild.find((arrayEl: any) => !arrayEl?._sliceName)
        ) {
          return;
        }
        // Filter so that if the child is a slice, we only count relevant slices
        // A slice is relevant if it is the child slice or is a reslice of child.
        // Typically, a sliceName that starts with child.sliceName + '/' is a reslice.
        instanceChild = instanceChild.filter(
          (arrayEl: any) =>
            !child.sliceName ||
            arrayEl?._sliceName === child.sliceName ||
            arrayEl?._sliceName?.toString().startsWith(`${child.sliceName}/`)
        );
        instanceChild.forEach((arrayEl: any) => {
          if (arrayEl != null) this.validateRequiredChildElements(arrayEl, child, fshDefinition);
        });
      } else if (instanceChild != null) {
        this.validateRequiredChildElements(instanceChild, child, fshDefinition);
      }
      // Log an error if:
      // 1 - The child element is 1.., but not on the instance
      // 2 - The child element is n..m, but it has k < n elements
      if (
        (child.min > 0 && instanceChild == null) ||
        (Array.isArray(instanceChild) && instanceChild.length < child.min)
      ) {
        // Can't point to any specific rule, so give sourceInfo of entire instance
        logger.error(
          `Element ${child.id} has minimum cardinality ${child.min} but occurs ${
            instanceChild ? instanceChild.length : 0
          } time(s).`,
          fshDefinition.sourceInfo
        );
      }
    });
  }

  /**
   * Check that all required elements are present on an instance
   * @param {InstanceDefinition} instanceDef - The InstanceDefinition we are validating
   * @param {ElementDefinition[]} elements - The elements of the StructDef that instanceDef is an instance of
   * @param {Instance} fshDefinition - The FSH definition that we built instanceDef from
   */
  private validateRequiredElements(
    instanceDef: InstanceDefinition,
    elements: ElementDefinition[],
    fshDefinition: Instance
  ): void {
    this.validateRequiredChildElements(instanceDef, elements[0], fshDefinition);
  }

  private shouldSetMetaProfile(instanceDef: InstanceDefinition): boolean {
    switch (this.tank.config.instanceOptions?.setMetaProfile) {
      case 'never':
        return false;
      case 'inline-only':
        return instanceDef._instanceMeta.usage === 'Inline';
      case 'standalone-only':
        return instanceDef._instanceMeta.usage !== 'Inline';
      case 'always':
      default:
        return true;
    }
  }

  private shouldSetId(instanceDef: InstanceDefinition): boolean {
    switch (this.tank.config.instanceOptions?.setId) {
      case 'standalone-only':
        return instanceDef._instanceMeta.usage !== 'Inline';
      case 'always':
      default:
        return true;
    }
  }

  fishForFHIR(item: string): InstanceDefinition {
    let result = this.pkg.fish(item, Type.Instance) as InstanceDefinition;
    if (result == null) {
      // If we find a FSH definition, then we can export and fish for it again
      const fshDefinition = this.tank.fish(item, Type.Instance) as Instance;
      if (fshDefinition) {
        this.exportInstance(fshDefinition);
        result = this.pkg.fish(item, Type.Instance) as InstanceDefinition;
      } else {
        // If we don't find any Instances with the name, fish for other resources
        const fishedFHIR = this.fisher.fishForFHIR(item);
        if (fishedFHIR && fishedFHIR.resourceType) {
          result = InstanceDefinition.fromJSON(fishedFHIR);
        }
      }
    }
    return result;
  }

  fishForMetadata(item: string): Metadata {
    // If it's in the tank, it can get the metadata from there (no need to export like in fishForFHIR)
    return this.fisher.fishForMetadata(item, Type.Instance);
  }

  exportInstance(fshDefinition: Instance): InstanceDefinition {
    if (this.pkg.instances.some(i => i._instanceMeta.name === fshDefinition.id)) {
      return;
    }

    let isResource = true;
    const json = this.fisher.fishForFHIR(
      fshDefinition.instanceOf,
      Type.Resource,
      Type.Profile,
      Type.Extension,
      Type.Type
    );

    if (!json) {
      throw new InstanceOfNotDefinedError(
        fshDefinition.name,
        fshDefinition.instanceOf,
        fshDefinition.sourceInfo
      );
    }

    // Since creating an instance of a Logical is not allowed,
    // creating an instance of a Profile of a logical model is also not allowed
    if (json.kind === 'logical' && json.derivation === 'constraint') {
      throw new InstanceOfLogicalProfileError(
        fshDefinition.name,
        fshDefinition.instanceOf,
        fshDefinition.sourceInfo
      );
    }

    if (json.kind !== 'resource') {
      // If the instance is not a resource, it should be inline, since it cannot exist as a standalone instance
      isResource = false;
      if (fshDefinition.usage !== 'Inline') {
        logger.warn(
          `Instance ${fshDefinition.name} is not an instance of a resource, so it should only be used inline on other instances, and it will not be exported to a standalone file. Specify "Usage: #inline" to remove this warning.`,
          fshDefinition.sourceInfo
        );
        fshDefinition.usage = 'Inline';
      }
    }

    const instanceOfStructureDefinition = StructureDefinition.fromJSON(json);
    let instanceDef = new InstanceDefinition();
    instanceDef._instanceMeta.name = fshDefinition.id; // This is name of the instance in the FSH
    if (fshDefinition.title) {
      instanceDef._instanceMeta.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      instanceDef._instanceMeta.description = fshDefinition.description;
    }
    if (fshDefinition.usage) {
      instanceDef._instanceMeta.usage = fshDefinition.usage;
      if (fshDefinition.usage === 'Definition') {
        if (
          instanceOfStructureDefinition.elements.some(
            element => element.id === `${instanceOfStructureDefinition.type}.url`
          )
        ) {
          instanceDef.url = `${this.tank.config.canonical}/${instanceOfStructureDefinition.type}/${fshDefinition.id}`;
        }
        if (
          fshDefinition.title &&
          instanceOfStructureDefinition.elements.some(
            element => element.id === `${instanceOfStructureDefinition.type}.title`
          )
        ) {
          instanceDef.title = fshDefinition.title;
        }
        if (
          fshDefinition.description &&
          instanceOfStructureDefinition.elements.some(
            element => element.id === `${instanceOfStructureDefinition.type}.description`
          )
        ) {
          instanceDef.description = fshDefinition.description;
        }
      }
    }
    if (isResource) {
      instanceDef.resourceType = instanceOfStructureDefinition.type; // ResourceType is determined by the StructureDefinition of the type
      if (this.shouldSetId(instanceDef)) {
        instanceDef.id = fshDefinition.id;
      }
    } else {
      instanceDef._instanceMeta.sdType = instanceOfStructureDefinition.type;
    }

    // Set Assigned values based on the FSH rules and the Structure Definition
    instanceDef = this.setAssignedValues(fshDefinition, instanceDef, instanceOfStructureDefinition);
    // should we add the instanceOf to meta.profile?
    // if the exact url is not in there, and a versioned url is also not in there, add it to the front.
    // otherwise, add it at the front.
    if (
      this.shouldSetMetaProfile(instanceDef) &&
      isResource &&
      instanceOfStructureDefinition.derivation === 'constraint'
    ) {
      // elements of instanceDef.meta.profile may be objects if they are provided by slices,
      // since they have to keep track of the _sliceName property.
      // this is technically not a match for the defined type of instanceDef.meta.profile,
      // so give the parameter a union type to handle both cases.
      if (
        !instanceDef.meta?.profile?.some((profile: string | { assignedValue: string }) => {
          const profileUrl = typeof profile === 'object' ? profile.assignedValue : profile;
          return (
            profileUrl === instanceOfStructureDefinition.url ||
            profileUrl.startsWith(`${instanceOfStructureDefinition.url}|`)
          );
        })
      ) {
        // we might have to create meta or meta.profile first, if no rules already created those
        if (instanceDef.meta == null) {
          instanceDef.meta = { profile: [instanceOfStructureDefinition.url] };
        } else if (instanceDef.meta.profile == null) {
          instanceDef.meta.profile = [instanceOfStructureDefinition.url];
        } else {
          instanceDef.meta.profile.unshift(instanceOfStructureDefinition.url);
        }
      }
    }
    instanceDef.validateId(fshDefinition);
    this.validateRequiredElements(
      instanceDef,
      instanceOfStructureDefinition.elements,
      fshDefinition
    );
    cleanResource(instanceDef);
    this.pkg.instances.push(instanceDef);

    // Once all rules are set, we should ensure that we did not add a duplicate profile URL anywhere
    if (instanceDef.meta?.profile) instanceDef.meta.profile = uniq(instanceDef.meta.profile);

    // check for another instance of the same type with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    // instanceDef has already been added to the package, so it's fine if it matches itself
    // inline instances are not written to their own files, so those can be skipped in this
    if (
      instanceDef._instanceMeta.usage !== 'Inline' &&
      this.pkg.instances.some(
        instance =>
          instance._instanceMeta.usage !== 'Inline' &&
          instanceDef.resourceType === instance.resourceType &&
          instanceDef.id === instance.id &&
          instanceDef !== instance
      )
    ) {
      logger.error(
        `Multiple instances of type ${instanceDef.resourceType} with id ${instanceDef.id}. Each non-inline instance of a given type must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    return instanceDef;
  }

  /**
   * Exports Instances
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {Package}
   */
  export(): Package {
    const instances = this.tank.getAllInstances();
    for (const instance of instances) {
      try {
        this.exportInstance(instance);
      } catch (e) {
        logger.error(e.message, e.sourceInfo);
      }
    }
    this.warnOnInstanceOfCustomResource();
    if (instances.length > 0) {
      logger.info(`Converted ${instances.length} FHIR instances.`);
    }
    return this.pkg;
  }
}
