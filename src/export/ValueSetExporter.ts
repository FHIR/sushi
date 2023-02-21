import { ValueSet, ValueSetComposeIncludeOrExclude, ValueSetComposeConcept } from '../fhirtypes';
import { FSHTank } from '../import/FSHTank';
import { FshValueSet, FshCode, ValueSetFilterValue, FshCodeSystem, Instance } from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { ValueSetComposeError, InvalidUriError } from '../errors';
import { Package } from '.';
import { MasterFisher, Type, resolveSoftIndexing } from '../utils';
import {
  CaretValueRule,
  ValueSetComponentRule,
  ValueSetConceptComponentRule,
  ValueSetFilterComponentRule
} from '../fshtypes/rules';
import {
  applyInsertRules,
  listUndefinedLocalCodes,
  setPropertyOnDefinitionInstance,
  cleanResource
} from '../fhirtypes/common';
import { isUri } from 'valid-url';
import { flatMap } from 'lodash';

export class ValueSetExporter {
  constructor(private readonly tank: FSHTank, private pkg: Package, private fisher: MasterFisher) {}

  private setMetadata(valueSet: ValueSet, fshDefinition: FshValueSet): void {
    valueSet.setName(fshDefinition);
    valueSet.setId(fshDefinition);
    if (fshDefinition.title == '') {
      logger.warn(`Value set ${fshDefinition.name} has a title field that should not be empty.`);
    }
    if (fshDefinition.description == '') {
      logger.warn(
        `Value set ${fshDefinition.name} has a description field that should not be empty.`
      );
    }
    if (fshDefinition.title) {
      valueSet.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      valueSet.description = fshDefinition.description;
    }
    // Version is set to value provided in config, will be overriden if reset by rules
    valueSet.version = this.tank.config.version;
    valueSet.url = `${this.tank.config.canonical}/ValueSet/${valueSet.id}`;
  }

  private setCompose(valueSet: ValueSet, components: ValueSetComponentRule[]) {
    if (components.length > 0) {
      valueSet.compose = {
        include: [],
        exclude: []
      };
      components.forEach(component => {
        const composeElement: ValueSetComposeIncludeOrExclude = {};
        if (component.from.system) {
          const systemParts = component.from.system.split('|');
          const foundSystem = (
            this.fisher.fishForMetadata(systemParts[0], Type.CodeSystem)?.url ??
            component.from.system
          ).split('|');
          composeElement.system = foundSystem[0];
          // if the rule specified a version, use that version.
          composeElement.version = systemParts.slice(1).join('|') || undefined;
          if (!isUri(composeElement.system)) {
            throw new InvalidUriError(composeElement.system);
          }
        }
        if (component.from.valueSets) {
          composeElement.valueSet = component.from.valueSets.map(vs => {
            return this.fisher.fishForMetadata(vs, Type.ValueSet)?.url ?? vs;
          });
          composeElement.valueSet.forEach(vs => {
            // Canonical URI may include | to specify version: https://www.hl7.org/fhir/references.html#canonical
            if (!isUri(vs.split('|')[0])) {
              throw new InvalidUriError(vs);
            }
          });
        }
        if (component instanceof ValueSetConceptComponentRule && component.concepts.length > 0) {
          composeElement.concept = component.concepts.map(concept => {
            const composeConcept: ValueSetComposeConcept = {
              code: concept.code
            };
            if (concept.display) {
              composeConcept.display = concept.display;
            }
            return composeConcept;
          });
          // if we can fish up the system in the tank, it's local, and we should check the listed concepts
          const codeSystem = this.tank.fish(composeElement.system, Type.CodeSystem);
          if (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance) {
            listUndefinedLocalCodes(
              codeSystem,
              composeElement.concept.map(concept => concept.code),
              this.tank,
              component
            );
          }
        } else if (
          component instanceof ValueSetFilterComponentRule &&
          component.filters.length > 0
        ) {
          composeElement.filter = component.filters.map(filter => {
            // if filter.value is a FshCode, perform the local code system check here as well
            if (filter.value instanceof FshCode) {
              const codeSystem = this.tank.fish(composeElement.system, Type.CodeSystem);
              if (codeSystem instanceof FshCodeSystem || codeSystem instanceof Instance) {
                listUndefinedLocalCodes(
                  codeSystem,
                  [(filter.value as FshCode).code],
                  this.tank,
                  component
                );
              }
            }

            return {
              property: filter.property.toString(),
              op: filter.operator.toString(),
              value: this.filterValueToString(filter.value)
            };
          });
        }
        if (component.inclusion) {
          if (composeElement.concept?.length > 0) {
            // warn the user if they have already included a concept in this component
            // concept, system, and version must all match to be considered equal
            const matchingComposeElements = valueSet.compose.include.filter(compose => {
              return (
                compose.system === composeElement.system &&
                compose.version === composeElement.version &&
                compose.concept?.length > 0
              );
            });
            const potentialMatches = flatMap(
              matchingComposeElements,
              compose => compose.concept
            ).map(concept => concept.code);
            composeElement.concept = composeElement.concept.filter(
              (concept, idx, currentConcepts) => {
                if (
                  potentialMatches.includes(concept.code) ||
                  currentConcepts
                    .slice(0, idx)
                    .some(duplicateConcept => duplicateConcept.code === concept.code)
                ) {
                  logger.warn(
                    `ValueSet ${valueSet.name} already includes ${composeElement.system}${
                      composeElement.version ? `|${composeElement.version}` : ''
                    }#${concept.code}`,
                    component.sourceInfo
                  );
                  return false;
                }
                return true;
              }
            );
            if (composeElement.concept.length > 0) {
              valueSet.compose.include.push(composeElement);
            }
          } else {
            valueSet.compose.include.push(composeElement);
          }
        } else {
          valueSet.compose.exclude.push(composeElement);
        }
      });
      if (valueSet.compose.exclude.length == 0) {
        delete valueSet.compose.exclude;
      }
    }
  }

  private setCaretRules(valueSet: ValueSet, rules: CaretValueRule[]) {
    resolveSoftIndexing(rules);
    for (const rule of rules) {
      try {
        if (rule instanceof CaretValueRule) {
          setPropertyOnDefinitionInstance(valueSet, rule.caretPath, rule.value, this.fisher);
        }
      } catch (e) {
        logger.error(e.message, rule.sourceInfo);
      }
    }
  }

  private filterValueToString(value: ValueSetFilterValue): string {
    if (value instanceof RegExp) {
      return value.source;
    } else if (value instanceof FshCode) {
      return value.code;
    } else {
      return value.toString();
    }
  }

  applyInsertRules(): void {
    const valueSets = this.tank.getAllValueSets();
    for (const vs of valueSets) {
      applyInsertRules(vs, this.tank);
    }
  }

  export(): Package {
    const valueSets = this.tank.getAllValueSets();
    for (const valueSet of valueSets) {
      try {
        this.exportValueSet(valueSet);
      } catch (e) {
        logger.error(e.message, valueSet.sourceInfo);
      }
    }
    if (valueSets.length > 0) {
      logger.info(`Converted ${valueSets.length} FHIR ValueSets.`);
    }
    return this.pkg;
  }

  exportValueSet(fshDefinition: FshValueSet): ValueSet {
    if (this.pkg.valueSets.some(vs => vs.name === fshDefinition.name)) {
      return;
    }
    const vs = new ValueSet();
    this.setMetadata(vs, fshDefinition);
    this.setCaretRules(
      vs,
      fshDefinition.rules.filter(rule => rule instanceof CaretValueRule) as CaretValueRule[]
    );
    this.setCompose(
      vs,
      fshDefinition.rules.filter(
        rule => rule instanceof ValueSetComponentRule
      ) as ValueSetComponentRule[]
    );
    if (vs.compose && vs.compose.include.length == 0) {
      throw new ValueSetComposeError(fshDefinition.name);
    }

    // check for another value set with the same id
    // see https://www.hl7.org/fhir/resource.html#id
    if (this.pkg.valueSets.some(valueSet => vs.id === valueSet.id)) {
      logger.error(
        `Multiple value sets with id ${vs.id}. Each value set must have a unique id.`,
        fshDefinition.sourceInfo
      );
    }

    cleanResource(vs, (prop: string) => ['_sliceName', '_primitive'].includes(prop));
    this.pkg.valueSets.push(vs);
    return vs;
  }
}
