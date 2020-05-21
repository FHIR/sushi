import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, InstanceDefinition, ElementDefinition, PathPart } from '../fhirtypes';
import { Instance } from '../fshtypes';
import { logger, Fishable, Type, Metadata } from '../utils';
import {
  setPropertyOnInstance,
  replaceReferences,
  cleanResource,
  splitOnPathPeriods,
  applyMixinRules,
  setImpliedPropertiesOnInstance
} from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import { Package } from '.';
import { cloneDeep } from 'lodash';

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
    let rules = fshInstanceDef.rules.map(r => cloneDeep(r));
    // Normalize all rules to not use the optional [0] index
    rules.forEach(r => {
      r.path = r.path.replace(/\[0+\]/g, '');
    });
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
    // Collect all paths that indicate the sub-paths of that path should be of a given resourceType
    // for example, if a.b = SomePatientInstance, then any subpath (a.b.x) must ensure that when validating
    // Patient is used for the type of a.b
    const inlineResourcePaths: { path: string; instanceOf: string }[] = [];
    rules.forEach(r => {
      if (r.isResource && r.fixedValue instanceof InstanceDefinition) {
        inlineResourcePaths.push({
          path: r.path,
          // We only use the first element of the meta.profile array, if a need arises for a more
          // comprehensive approach, we can come back to this later
          instanceOf: r.fixedValue.meta?.profile[0] ?? r.fixedValue.resourceType
        });
      }
      if (r.path.endsWith('.resourceType') && typeof r.fixedValue === 'string') {
        inlineResourcePaths.push({
          // Only get the part of the path before resourceType, aka if path is a.b.resourceType
          // the relevant element is a.b, since it is the actual Resource element
          path: splitOnPathPeriods(r.path).slice(0, -1).join('.'),
          instanceOf: r.fixedValue
        });
      }
    });

    // When fixing values, things happen in the order:
    // 1 - Validate values for rules that are on the instance
    // 2 - Determine all rules implied by the Structure Definition
    // 3 - Set values from rules implied by the Structure Definition
    // 4 - Set values from rules directly on the instance
    // This order is required due to the fact that validateValueAtPath changes instanceOfStructureDefinition
    // in certain cases that must happen before setting rules from the Structure Definition. In the future
    // we may want to refactor validateValueAtPath, but for now things should happen in this order
    const ruleMap: Map<string, { pathParts: PathPart[]; fixedValue: any }> = new Map();
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
        const validatedRule = instanceOfStructureDefinition.validateValueAtPath(
          rule.path,
          rule.fixedValue,
          this.fisher,
          rule.units,
          inlineResourceTypes
        );
        // Record each valid rule in a map
        ruleMap.set(rule.path, {
          pathParts: validatedRule.pathParts,
          fixedValue: validatedRule.fixedValue
        });
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });

    const paths = ['', ...rules.map(rule => rule.path)];
    setImpliedPropertiesOnInstance(instanceDef, instanceOfStructureDefinition, paths, this.fisher);
    ruleMap.forEach(rule => setPropertyOnInstance(instanceDef, rule.pathParts, rule.fixedValue));
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
    children.forEach(child => {
      // Get the last part of the path, A.B.C => C
      const childPathEnd = child.path.split('.').slice(-1)[0];
      // Note that in most cases the _ prefixed element will not exist. But if it does exist, we validate
      // using the _ prefixed element, since it will contain any children of the primitive
      let instanceChild = instance[`_${childPathEnd}`] ?? instance[childPathEnd];
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
    cleanResource(instanceDef);
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
