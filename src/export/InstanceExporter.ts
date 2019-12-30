import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, InstanceDefinition, ResolveFn } from '../fhirtypes';
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

    // All other values of the instance will be fixedValues explicitly on the FSH Instance
    instanceDef = this.setFixedValues(fshDefinition, instanceDef, instanceOfStructureDefinition);

    // Add any set values that were set on the StructDef but not explicitly on the FSH Instance

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
