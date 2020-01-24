import { FSHTank } from '../import/FSHTank';
import { StructureDefinition, InstanceDefinition, ElementDefinition } from '../fhirtypes';
import { Instance } from '../fshtypes';
import { logger, Fishable, Type } from '../utils';
import { setPropertyOnInstance, replaceReferences, replaceField } from '../fhirtypes/common';
import { InstanceOfNotDefinedError } from '../errors/InstanceOfNotDefinedError';
import { Package } from '.';
import isEmpty from 'lodash/isEmpty';

export class InstanceExporter {
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
    this.setFixedValuesForDirectChildren(
      instanceOfStructureDefinition.findElement(instanceDef.resourceType),
      '',
      instanceDef,
      instanceOfStructureDefinition
    );

    // All rules will be FixValueRule
    fshInstanceDef.rules.forEach(rule => {
      rule = replaceReferences(rule, this.tank, this.fisher);
      try {
        const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
          rule.path,
          rule.fixedValue,
          this.fisher
        );

        // For each part of that path, we add fixed values from the SD
        let path = '';
        for (const [i, pathPart] of pathParts.entries()) {
          path += `${path ? '.' : ''}${pathPart.base}`;
          // Add back non-numeric (slice) brackets
          pathPart.brackets?.forEach(b => (path += /^[-+]?\d+$/.test(b) ? '' : `[${b}]`));
          const element = instanceOfStructureDefinition.findElementByPath(path, this.fisher);
          // Reconstruct the part of the rule's path that we just got the element for
          let rulePathPart = rule.path
            .split('.')
            .slice(0, i + 1)
            .join('.');
          rulePathPart += '.';

          this.setFixedValuesForDirectChildren(
            element,
            rulePathPart,
            instanceDef,
            instanceOfStructureDefinition
          );
        }

        // Fix value fom the rule
        setPropertyOnInstance(instanceDef, pathParts, fixedValue);
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    });

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
   * @param {string} existingPath - The path to the element whose children we will fix
   * @param {InstanceDefinition} instanceDef - The InstanceDefinition to fix values on
   * @param {StructureDefinition} instanceOfStructureDefinition - The structure definition the instance instantiates
   */
  private setFixedValuesForDirectChildren(
    element: ElementDefinition,
    existingPath: string,
    instanceDef: InstanceDefinition,
    instanceOfStructureDefinition: StructureDefinition
  ) {
    const directChildren = element.children(true);
    for (const child of directChildren) {
      // Fixed values may be specified by the fixed[x] or pattern[x] fields
      const fixedValueKey = Object.keys(child).find(
        k => k.startsWith('fixed') || k.startsWith('pattern')
      );
      if (fixedValueKey) {
        // Get the end of the child path, this is the part that differs from existingPath
        const childPathPart = child
          .diffId()
          .split('.')
          .slice(-1)[0];

        try {
          const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
            existingPath + childPathPart,
            child[fixedValueKey as keyof ElementDefinition],
            this.fisher
          );
          setPropertyOnInstance(instanceDef, pathParts, fixedValue);
        } catch (e) {
          logger.error(e.message);
        }
      }
    }
  }

  exportInstance(fshDefinition: Instance): InstanceDefinition {
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
    instanceDef.instanceName = fshDefinition.id; // This is name of the instance in the FSH
    instanceDef.id = fshDefinition.id;

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
   * @returns {Package}
   */
  export(): Package {
    for (const instance of this.tank.getAllInstances()) {
      try {
        const instanceDef = this.exportInstance(instance);
        this.pkg.instances.push(instanceDef);
      } catch (e) {
        logger.error(e.message, e.sourceInfo);
      }
    }
    return this.pkg;
  }
}
