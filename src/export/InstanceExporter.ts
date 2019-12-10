import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, PathPart } from '../fhirtypes';
import { Instance } from '../fshtypes';
import { FHIRDefinitions } from '../fhirdefs';
import { StructureDefinitionExporter } from '.';
import { logger } from '../utils/FSHLogger';
import { getArrayIndex } from '../fhirtypes/common';

export type InstanceDefinition = {
  resourceType: string;
  instanceName: string;
  id: string;
};

export class InstanceExporter {
  constructor(public readonly FHIRDefs: FHIRDefinitions, public readonly tank: FSHTank) {}

  private setInstanceDefinitionPropertyByPath(
    instance: InstanceDefinition,
    pathParts: PathPart[],
    fixedValue: any
  ): InstanceDefinition {
    if (fixedValue != null) {
      // If we can fix the value on the StructureDefinition StructureDefinition, then we can set the
      // instance property here
      let current: any = instance;
      for (const [i, pathPart] of pathParts.entries()) {
        const key = pathPart.base;
        // If this part of the path indexes into an array, the index will be the last bracket
        const index = getArrayIndex(pathPart);
        if (index != null) {
          // If the array doesn't exist, create it
          if (current[key] == null) current[key] = [];
          // If the index doesn't exist in the array, add it and lesser indices
          if (index >= current[key].length) {
            current[key][index] = {};
          }
          // If it isn't the last element, move on, if it is, set the value
          if (i < pathParts.length - 1) {
            current = current[key][index];
          } else {
            current[key][index] = fixedValue;
          }
        } else {
          // If it isn't the last element, move on, if it is, set the value
          if (i < pathParts.length - 1) {
            if (current[key] == null) current[key] = {};
            current = current[key];
          } else {
            current[key] = fixedValue;
          }
        }
      }
    }
    return instance;
  }

  private setFixedValues(
    fshInstanceDef: Instance,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition,
    structDefExporter: StructureDefinitionExporter
  ): InstanceDefinition {
    // All rules will be FixValueRule
    fshInstanceDef.rules.forEach(rule => {
      const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
        rule.path,
        rule.fixedValue,
        structDefExporter.resolve.bind(this)
      );

      instanceDef = this.setInstanceDefinitionPropertyByPath(instanceDef, pathParts, fixedValue);
    });

    return instanceDef;
  }

  /**
   * Exports Instances
   * @param {FSHTank} tank - The FSH tank we are exporting
   * @returns {InstanceDefinition[]}
   */
  export(): InstanceDefinition[] {
    const instanceDefs: InstanceDefinition[] = [];
    for (const doc of this.tank.docs) {
      for (const instance of doc.instances.values()) {
        try {
          const docInstances = this.exportInstance(instance);
          instanceDefs.push(docInstances);
        } catch (e) {
          logger.error(e.message);
        }
      }
    }
    return instanceDefs;
  }

  exportInstance(fshDefinition: Instance): InstanceDefinition {
    const structDefExporter = new StructureDefinitionExporter(this.FHIRDefs, this.tank);
    let instanceOfStructureDefinition = structDefExporter.resolve(fshDefinition.instanceOf);

    let instanceDef: InstanceDefinition = {
      resourceType: instanceOfStructureDefinition.type, // ResourceType is determined by the StructureDefinition of the type
      instanceName: fshDefinition.id, // This is name of the instance in the FSH
      id: '' // Gets set by the instance values
    };

    // All other values of the instance will be fixedValues explicitly on the FSH Instance
    instanceDef = this.setFixedValues(
      fshDefinition,
      instanceDef,
      instanceOfStructureDefinition,
      structDefExporter
    );

    // Add any set values that were set on the StructDef but not explicitly on the FSH Instance

    // Any missing/extra cardinalities

    return instanceDef;
  }
}
