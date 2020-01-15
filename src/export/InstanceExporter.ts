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
import { setPropertyOnInstance, replaceReferences, replaceField } from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import isEmpty from 'lodash/isEmpty';

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
      rule = replaceReferences(rule, this.tank, this.resolve);
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
        // Add back non-numeric (slice) brackets
        pathPart.brackets?.forEach(b => (path += /^[-+]?\d+$/.test(b) ? '' : `[${b}]`));
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

    // Add the SD we are making an instance of to meta.profile, as long as SD is not a base FHIR resource
    // If we end up adding more metadata, we should wrap this in a setMetadata function
    if (instanceOfStructureDefinition.derivation === 'constraint') {
      instanceDef.meta = { profile: [instanceOfStructureDefinition.url] };
    }
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
