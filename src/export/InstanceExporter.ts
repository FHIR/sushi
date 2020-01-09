import { FSHTank } from '../import/FSHTank';
import {
  StructureDefinition,
  InstanceDefinition,
  ResolveFn,
  ElementDefinition,
  PathPart
} from '../fhirtypes';
import { Instance } from '../fshtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';
import { setPropertyOnInstance, replaceReferences } from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';

export class InstanceExporter {
  constructor(
    public readonly FHIRDefs: FHIRDefinitions,
    public readonly tank: FSHTank,
    public readonly resolve: ResolveFn
  ) {}

  private setFixedValues(
    fshInstanceDef: Instance,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ): InstanceDefinition {
    // All rules will be FixValueRule
    fshInstanceDef.rules.forEach(rule => {
      replaceReferences(rule, this.tank, this.resolve);
      const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
        rule.path,
        rule.fixedValue,
        this.resolve
      );

      setPropertyOnInstance(instanceDef, pathParts, fixedValue);

      // For each part of that path, we add fixed values from the SD
      let path = '';
      for (const [i, pathPart] of pathParts.entries()) {
        path += `${path ? '.' : ''}${pathPart.base}`;
        const element = instanceOfStructureDefinition.findElementByPath(path, this.resolve);
        this.setFixedValuesForDirectChildren(element, pathParts.slice(0, i + 1), instanceDef);
      }
    });

    // Fix values from the SD for all elements at the top level of the SD
    this.setFixedValuesForDirectChildren(
      instanceOfStructureDefinition.findElement(instanceDef.resourceType),
      [],
      instanceDef
    );

    return instanceDef;
  }

  /**
   * Given an ElementDefinition, set fixed values for the direct children of that element
   * according to the ElementDefinitions of the children
   * @param {ElementDefinition} element - The element whose children we will fix
   * @param {PathPart[]} existingPath - The path to the element whose children we will fix
   * @param {InstanceDefinition} instanceDef - The InstanceDefinition to fix values on
   */
  private setFixedValuesForDirectChildren(
    element: ElementDefinition,
    existingPath: PathPart[],
    instanceDef: InstanceDefinition
  ) {
    const directChildren = element.children(true);
    for (const child of directChildren) {
      // Fixed values may be specified by the fixed[x] or pattern[x] fields
      const fixedValueKey = Object.keys(child).find(
        k => k.startsWith('fixed') || k.startsWith('pattern')
      );
      if (fixedValueKey) {
        // Get the end of the child path, this is the part that differs from existingPath
        const childPathPart = {
          base: child
            .diffId()
            .split('.')
            .slice(-1)[0]
        };
        setPropertyOnInstance(
          instanceDef,
          [...existingPath, childPathPart],
          child[fixedValueKey as keyof ElementDefinition]
        );
      }
    }
  }

  exportInstance(fshDefinition: Instance): InstanceDefinition {
    const instanceOfStructureDefinition = this.resolve(fshDefinition.instanceOf);

    if (!instanceOfStructureDefinition) {
      throw new InstanceOfNotDefinedError(
        fshDefinition.name,
        fshDefinition.instanceOf,
        fshDefinition.sourceInfo
      );
    }

    let instanceDef = new InstanceDefinition();
    instanceDef.resourceType = instanceOfStructureDefinition.type; // ResourceType is determined by the StructureDefinition of the type
    instanceDef.instanceName = fshDefinition.id; // This is name of the instance in the FSH

    // Set Fixed values based on the FSH rules and the Structure Definition
    instanceDef = this.setFixedValues(fshDefinition, instanceDef, instanceOfStructureDefinition);

    return instanceDef;
  }

  /**
   * Exports Instances
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {InstanceDefinition[]} - The Instances exported
   */
  export(): InstanceDefinition[] {
    const instanceDefs: InstanceDefinition[] = [];
    for (const doc of this.tank.docs) {
      for (const instance of doc.instances.values()) {
        try {
          const instanceDef = this.exportInstance(instance);
          instanceDefs.push(instanceDef);
        } catch (e) {
          logger.error(e.message, e.sourceInfo);
        }
      }
    }
    return instanceDefs;
  }
}
