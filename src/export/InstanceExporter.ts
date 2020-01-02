import { FSHTank } from '../import/FSHTank';
import {
  StructureDefinition,
  InstanceDefinition,
  ResolveFn,
  ElementDefinition
} from '../fhirtypes';
import { Instance } from '../fshtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { logger } from '../utils/FSHLogger';
import { setPropertyOnInstance } from '../fhirtypes/common';
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
      const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
        rule.path,
        rule.fixedValue,
        this.resolve
      );

      setPropertyOnInstance(instanceDef, pathParts, fixedValue);
    });

    return instanceDef;
  }

  /**
   * Sets fixed values on the instance via the Structure Definition
   * @param {InstanceDefinition} instanceDef - The instance we are defining
   * @param {StructureDefinition} instanceOfStructureDefinition - The Structure Definition that we are making an instance of
   */
  private setFixedValuesFromStructureDefinition(
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ) {
    for (const element of instanceOfStructureDefinition.elements) {
      // we need to find fixed[x] or pattern[x] elements
      const fixedValueKey = Object.keys(element).find(
        k => k.startsWith('fixed') || k.startsWith('pattern')
      );
      if (fixedValueKey) {
        // If the id of an element has a choice, it is represented on the element using slicing
        // ex: Patient.value[x]:valueQuantity.units
        // But in an instance we need to represent this using the slice name
        // ex: Patient.valueQuantity.units would be the path in the json
        const choiceResolvedPath = element.id
          .split('.')
          .map(p => {
            const i = p.indexOf('[x]:');
            return i > -1 ? p.slice(i + 4) : p;
          })
          .join('.');
        const pathParts = choiceResolvedPath
          .split('.')
          // Ignore first part of the path since it is just the resource name
          .slice(1)
          .map(p => {
            return { base: p };
          });
        setPropertyOnInstance(
          instanceDef,
          pathParts,
          element[fixedValueKey as keyof ElementDefinition]
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

    // Add any set values that were set on the StructDef but not explicitly on the FSH Instance
    this.setFixedValuesFromStructureDefinition(instanceDef, instanceOfStructureDefinition);

    // All other values of the instance will be fixedValues explicitly on the FSH Instance
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
