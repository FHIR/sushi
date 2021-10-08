import {
  ValueSet,
  ValueSetComposeIncludeOrExclude,
  ValueSetComposeConcept,
  StructureDefinition
} from '../fhirtypes';
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
  ValueSetFilterComponentRule,
  ConceptRule,
  AssignmentRule
} from '../fshtypes/rules';
import { setPropertyOnInstance, applyInsertRules } from '../fhirtypes/common';
import { isUri } from 'valid-url';
import { flatMap } from 'lodash';

export class ValueSetExporter {
  constructor(private readonly tank: FSHTank, private pkg: Package, private fisher: MasterFisher) {}

  private setMetadata(valueSet: ValueSet, fshDefinition: FshValueSet): void {
    valueSet.setName(fshDefinition.name, fshDefinition.sourceInfo);
    valueSet.setId(fshDefinition.id, fshDefinition.sourceInfo);
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
          let strangeConcepts: ValueSetComposeConcept[] = [];
          if (codeSystem instanceof FshCodeSystem) {
            applyInsertRules(codeSystem, this.tank);
            strangeConcepts = composeElement.concept.filter(composeConcept => {
              return !codeSystem.rules.some(
                rule => rule instanceof ConceptRule && rule.code === composeConcept.code
              );
            });
          } else if (codeSystem instanceof Instance) {
            applyInsertRules(codeSystem, this.tank);
            const conceptRulePath = /^(concept(\[(\d+|\+|=)\])?\.)+code$/;
            strangeConcepts = composeElement.concept.filter(composeConcept => {
              return !codeSystem.rules.some(
                rule =>
                  rule instanceof AssignmentRule &&
                  conceptRulePath.test(rule.path) &&
                  rule.value instanceof FshCode &&
                  rule.value.code === composeConcept.code
              );
            });
          }
          if (strangeConcepts.length > 0) {
            logger.error(
              `Code${strangeConcepts.length > 1 ? 's' : ''} ${strangeConcepts
                .map(sc => `"${sc.code}"`)
                .join(', ')} ${strangeConcepts.length > 1 ? 'are' : 'is'} not defined for system ${
                codeSystem.name
              }.`,
              component.sourceInfo
            );
          }
        } else if (
          component instanceof ValueSetFilterComponentRule &&
          component.filters.length > 0
        ) {
          composeElement.filter = component.filters.map(filter => {
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
    const vsStructureDefinition = StructureDefinition.fromJSON(
      this.fisher.fishForFHIR('ValueSet', Type.Resource)
    );
    resolveSoftIndexing(rules);
    for (const rule of rules) {
      try {
        if (rule instanceof CaretValueRule) {
          const { assignedValue, pathParts } = vsStructureDefinition.validateValueAtPath(
            rule.caretPath,
            rule.value,
            this.fisher
          );
          setPropertyOnInstance(valueSet, pathParts, assignedValue, this.fisher);
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
    // fshDefinition.rules may include insert rules, which must be expanded before applying other rules
    applyInsertRules(fshDefinition, this.tank);
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

    this.pkg.valueSets.push(vs);
    return vs;
  }
}
