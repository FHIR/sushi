import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, InstanceDefinition, ElementDefinition } from '../fhirtypes';
import { Instance } from '../fshtypes';
import { logger, Fishable, Type, Metadata } from '../utils';
import {
  setPropertyOnInstance,
  replaceReferences,
  replaceField,
  splitOnPathPeriods,
  applyMixinRules
} from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import { Package } from '.';
import { isEmpty, cloneDeep } from 'lodash';

export class InstanceExporter implements Fishable {
  constructor(
    private readonly tank: FSHTank,
    private readonly pkg: Package,
    private readonly fisher: Fishable
  ) {}

  private setFixedValues(
    fshInstanceDef: Instance,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ): InstanceDefinition {
    // Fix values from the SD for all elements at the top level of the SD
    this.setFixedValuesFromStructureDefinition(
      instanceOfStructureDefinition.findElement(instanceDef.resourceType),
      '',
      instanceDef,
      instanceOfStructureDefinition
    );

    let rules = fshInstanceDef.rules.map(r => cloneDeep(r));
    rules = rules.map(r => replaceReferences(r, this.tank, this.fisher));
    // Convert strings in fixedValueRules to instances
    rules = rules.filter(r => {
      if (r.isResource) {
        const instance: InstanceDefinition = this.fishForFHIR(r.fixedValue as string);
        if (instance != null) {
          r.fixedValue = instance.toJSON();
          return true;
        } else {
          logger.error(
            `Cannot find definition for Instance: ${r.fixedValue}. Skipping rule.`,
            r.sourceInfo
          );
          return false;
        }
      }
      return true;
    });

    // Fix all values from the SD that are exposed when processing the instance rules
    rules.forEach(rule => {
      try {
        const validated = instanceOfStructureDefinition.validateValueAtPath(
          rule.path,
          rule.fixedValue,
          this.fisher
        );

        // For each part of that path, we add fixed values from the SD
        let path = '';
        for (const [i, pathPart] of validated.pathParts.entries()) {
          path += `${path ? '.' : ''}${pathPart.base}`;
          // Add back non-numeric (slice) brackets
          pathPart.brackets?.forEach(b => (path += /^[-+]?\d+$/.test(b) ? '' : `[${b}]`));
          const element = instanceOfStructureDefinition.findElementByPath(path, this.fisher);
          // Reconstruct the part of the rule's path that we just got the element for
          let rulePathPart = splitOnPathPeriods(rule.path)
            .slice(0, i + 1)
            .join('.');
          rulePathPart += '.';

          this.setFixedValuesFromStructureDefinition(
            element,
            rulePathPart,
            instanceDef,
            instanceOfStructureDefinition
          );
        }
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });

    // Fix all values explicitly set in the instance rules (all rules will be FixValueRule)
    rules.forEach(rule => {
      try {
        const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
          rule.path,
          rule.fixedValue,
          this.fisher,
          rule.units
        );
        // Fix value fom the rule
        setPropertyOnInstance(instanceDef, pathParts, fixedValue);
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });

    return instanceDef;
  }

  /**
   * Given an ElementDefinition, set fixed values for the direct children of that element
   * according to the ElementDefinitions of the children
   * This function assumes that when it is called on an element, it has alreday been called on parents of that element
   * @param {ElementDefinition} element - The element whose children we will fix
   * @param {string} existingPath - The path to the element whose children we will fix
   * @param {InstanceDefinition} instanceDef - The InstanceDefinition to fix values on
   * @param {StructureDefinition} instanceOfStructureDefinition - The structure definition the instance instantiates
   */
  private setFixedValuesFromStructureDefinition(
    element: ElementDefinition,
    existingPath: string,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ) {
    // We will fix values on the element, or direct children
    const fixableElements = [element, ...element.children(true)];
    for (const fixableElement of fixableElements) {
      // Fixed values may be specified by the fixed[x] or pattern[x] fields
      const fixedValueKey = Object.keys(fixableElement).find(
        k => k.startsWith('fixed') || k.startsWith('pattern')
      );
      // Fixed value can come from fixed[x] or pattern[x] directly on element, or via pattern[x] on parent
      const foundFixedValue = cloneDeep(fixableElement[fixedValueKey as keyof ElementDefinition]);
      // We only fix the value if the element is the original element, or it is a direct child with card 1..n
      if (foundFixedValue && (fixableElement.id === element.id || fixableElement.min > 0)) {
        // Get the end of the path, this is the part that differs from existingPath
        let fixablePath = fixableElement.diffId().replace(`${element.diffId()}`, '');
        // If the fixableElement is a child of the original element, we must remove prefixed '.' from path
        if (fixablePath.startsWith('.')) fixablePath = fixablePath.slice(1);

        // Turn FHIR slicing (element:slicName/resliceName) into FSH slicing (element[sliceName][resliceName])
        const colonSplitPath = fixablePath.split(':');
        let fshElementPath = colonSplitPath[0];
        const slicePathSection = colonSplitPath[1];
        const sliceNames = slicePathSection?.split('/');
        sliceNames?.forEach(s => {
          fshElementPath += `[${s}]`;
        });
        // Fix the value if we validly can
        try {
          const { pathParts } = instanceOfStructureDefinition.validateValueAtPath(
            // fshElementPath is '' when the fixableElement is the original element, trailing '.' on this path must be removed
            // Otherwise add the child path to existing path
            fshElementPath === '' ? existingPath.slice(0, -1) : existingPath + fshElementPath,
            // We don't actually want to validate the value, we only want to validate the path, so pass null
            // we already know the value is valid, since we got it from the Structure Definition
            null,
            this.fisher
          );
          setPropertyOnInstance(instanceDef, pathParts, foundFixedValue);
        } catch (e) {
          logger.error(e.message);
        }
      } else if (foundFixedValue) {
        logger.debug(
          `Element ${fixableElement.id} is optional with min cardinality 0, so fixed value for optional element is not set on instance ${instanceDef._instanceMeta.name}`
        );
      }
    }
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
    children.forEach(child => {
      // Get the last part of the path, A.B.C => C
      const childPathEnd = child.path.split('.').slice(-1)[0];
      let instanceChild = instance[childPathEnd];
      // If the element is a choice, we will fail to find it, we need to use the choice name
      if (instanceChild == null && childPathEnd.endsWith('[x]')) {
        const choiceSlices = children.filter(c => c.path === child.path && c.sliceName);
        for (const choiceSlice of choiceSlices) {
          instanceChild = instance[choiceSlice.sliceName];
          if (instanceChild != null) {
            break;
          }
        }
      }
      // Recursively validate children of the current element
      if (Array.isArray(instanceChild)) {
        // Filter so that if the child is a slice, we only count relevant slices
        instanceChild = instanceChild.filter(
          (arrayEl: any) => !child.sliceName || arrayEl?._sliceName === child.sliceName
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

  /**
   * Cleans up temporary properties that were added to the InstanceDefinition during processing
   * @param {InstanceDefinition} instanceDef - The InstanceDefinition to clean
   */
  private cleanInstance(instanceDef: InstanceDefinition): void {
    // Remove all _sliceName fields
    replaceField(
      instanceDef,
      (o, p) => p === '_sliceName',
      (o, p) => delete o[p]
    );
    // Change any {} to null
    replaceField(
      instanceDef,
      (o, p) => typeof o[p] === 'object' && o[p] !== null && isEmpty(o[p]),
      (o, p) => (o[p] = null)
    );

    // Change back any primitives that have been converted into objects by setPropertyOnInstance
    replaceField(
      instanceDef,
      (o, p) => typeof o[p] === 'object' && o[p] !== null && o[p]._primitive,
      (o, p) => (o[p] = o[p].fixedValue)
    );
  }

  fishForFHIR(item: string) {
    let result = this.fisher.fishForFHIR(item, Type.Instance);
    if (result == null) {
      // If we find a FSH definition, then we can export and fish for it again
      const fshDefinition = this.tank.fish(item, Type.Instance) as Instance;
      if (fshDefinition) {
        this.exportInstance(fshDefinition);
        result = this.fisher.fishForFHIR(item, Type.Instance);
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

    const json = this.fisher.fishForFHIR(
      fshDefinition.instanceOf,
      Type.Resource,
      Type.Type,
      Type.Profile,
      Type.Extension
    );

    if (!json) {
      throw new InstanceOfNotDefinedError(
        fshDefinition.name,
        fshDefinition.instanceOf,
        fshDefinition.sourceInfo
      );
    }

    const instanceOfStructureDefinition = StructureDefinition.fromJSON(json);

    let instanceDef = new InstanceDefinition();
    instanceDef.resourceType = instanceOfStructureDefinition.type; // ResourceType is determined by the StructureDefinition of the type
    instanceDef._instanceMeta.name = fshDefinition.id; // This is name of the instance in the FSH
    if (fshDefinition.title) {
      instanceDef._instanceMeta.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      instanceDef._instanceMeta.description = fshDefinition.description;
    }
    if (fshDefinition.usage) {
      instanceDef._instanceMeta.usage = fshDefinition.usage;
    }
    instanceDef.id = fshDefinition.id;

    // Add the SD we are making an instance of to meta.profile, as long as SD is not a base FHIR resource
    // If we end up adding more metadata, we should wrap this in a setMetadata function
    if (instanceOfStructureDefinition.derivation === 'constraint') {
      instanceDef.meta = { profile: [instanceOfStructureDefinition.url] };
    }

    this.pkg.instances.push(instanceDef);

    applyMixinRules(fshDefinition, this.tank);
    // Set Fixed values based on the FSH rules and the Structure Definition
    instanceDef = this.setFixedValues(fshDefinition, instanceDef, instanceOfStructureDefinition);
    instanceDef.validateId(fshDefinition.sourceInfo);
    this.validateRequiredElements(
      instanceDef,
      instanceOfStructureDefinition.elements,
      fshDefinition
    );
    this.cleanInstance(instanceDef);
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
    if (instances.length > 0) {
      logger.info(`Converted ${instances.length} FHIR instances.`);
    }
    return this.pkg;
  }
}
