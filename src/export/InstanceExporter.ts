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
    this.setFixedValuesFromStructureDefinition(
      instanceOfStructureDefinition.findElement(instanceDef.resourceType),
      '',
      instanceDef,
      instanceOfStructureDefinition
    );

    const rules = fshInstanceDef.rules.map(r => replaceReferences(r, this.tank, this.fisher));

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
          let rulePathPart = rule.path
            .split(/\.(?![^\[]*\])/g) // match a period that isn't within square brackets
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
          this.fisher
        );
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
      const foundFixedValue =
        fixableElement[fixedValueKey as keyof ElementDefinition] ?? fixableElement.fixedByParent();
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
          const { fixedValue, pathParts } = instanceOfStructureDefinition.validateValueAtPath(
            // fshElementPath is '' when the fixableElement is the original element, trailing '.' on this path must be removed
            // Otherwise add the child path to existing path
            fshElementPath === '' ? existingPath.slice(0, -1) : existingPath + fshElementPath,
            foundFixedValue,
            this.fisher
          );
          setPropertyOnInstance(instanceDef, pathParts, fixedValue);
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
    instanceDef._instanceMeta.name = fshDefinition.id; // This is name of the instance in the FSH
    if (fshDefinition.title) {
      instanceDef._instanceMeta.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      instanceDef._instanceMeta.description = fshDefinition.description;
    }
    instanceDef.id = fshDefinition.id;

    // Add the SD we are making an instance of to meta.profile, as long as SD is not a base FHIR resource
    // If we end up adding more metadata, we should wrap this in a setMetadata function
    if (instanceOfStructureDefinition.derivation === 'constraint') {
      instanceDef.meta = { profile: [instanceOfStructureDefinition.url] };
    }
    // Set Fixed values based on the FSH rules and the Structure Definition
    instanceDef = this.setFixedValues(fshDefinition, instanceDef, instanceOfStructureDefinition);
    instanceDef.validateId(fshDefinition.sourceInfo);
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
        const instanceDef = this.exportInstance(instance);
        this.pkg.instances.push(instanceDef);
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
