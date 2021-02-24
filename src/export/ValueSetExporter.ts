import {
  ValueSet,
  ValueSetComposeIncludeOrExclude,
  ValueSetComposeConcept,
  StructureDefinition,
  ValueSetExpansionContains
} from '../fhirtypes';
import { FSHTank } from '../import/FSHTank';
import { FshValueSet, FshCode, ValueSetFilterValue } from '../fshtypes';
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
import { setPropertyOnInstance, applyInsertRules } from '../fhirtypes/common';
import { isUri } from 'valid-url';
import fromPairs from 'lodash/fromPairs';
import cloneDeep from 'lodash/cloneDeep';
import flatMap from 'lodash/flatMap';

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
          const foundSystem = (
            this.fisher.fishForMetadata(component.from.system, Type.CodeSystem)?.url ??
            component.from.system
          ).split('|');
          composeElement.system = foundSystem[0];
          composeElement.version = foundSystem.slice(1).join('|') || undefined;
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
          valueSet.compose.include.push(composeElement);
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
          setPropertyOnInstance(valueSet, pathParts, assignedValue);
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

  private performExpansion(valueSet: ValueSet) {
    if (
      valueSet.expansion?.parameter?.find(
        parameter => parameter.name === 'sushi-generated' && parameter.valueBoolean === true
      )
    ) {
      const errors: string[] = [];
      // the compose property must be defined
      if (!valueSet.compose) {
        errors.push('No composition defined.');
      }
      // filter operators are prohibited
      if (
        [...(valueSet.compose?.include ?? []), ...(valueSet.compose?.exclude ?? [])].some(
          compose => {
            return compose.filter?.some(filter => {
              return filter.op?.length;
            });
          }
        )
      ) {
        errors.push('Composition contains filter operators.');
      }
      // including/excluding value sets are prohibited
      if (
        [...(valueSet.compose?.include ?? []), ...(valueSet.compose?.exclude ?? [])].some(
          compose => {
            return compose.valueSet?.length && !compose.concept?.length;
          }
        )
      ) {
        errors.push('Composition contains other value sets.');
      }
      // full usage of non-local code systems are prohibited
      const referencedCodeSystems = fromPairs(
        [...(valueSet.compose?.include ?? []), ...(valueSet.compose?.exclude ?? [])]
          .filter(compose => {
            return !compose.concept?.length && compose.system;
          })
          .map(compose => [
            compose.system,
            this.fisher.fishForFHIR(compose.system, Type.CodeSystem)
          ])
      );
      // if we were able to fish up definitions for all of these systems, we're good
      if (Object.values(referencedCodeSystems).includes(undefined)) {
        errors.push('Composition contains code systems without available concept lists.');
      }

      // what we like best of all is when we just have a list of concepts. they'll even have a system specified already!
      if (errors.length) {
        logger.error(`Unable to expand ValueSet ${valueSet.name}: ${errors.join(' ')}`);
      } else {
        valueSet.expansion.contains = [];

        valueSet.compose.include.forEach(compose => {
          // add specific included codes
          compose.concept?.forEach(concept => {
            const containedItem: ValueSetExpansionContains = {
              system: compose.system,
              code: concept.code
            };
            if (compose.version) {
              containedItem.version = compose.version;
            }
            if (concept.display) {
              containedItem.display = concept.display;
            }
            if (concept.designation) {
              containedItem.designation = cloneDeep(concept.designation);
            }
            // add only if the concept is not already present
            if (!this.isConceptPresent(containedItem, valueSet.expansion.contains)) {
              valueSet.expansion.contains.push(containedItem);
            }
          });
          // add known included code systems
          if (!compose.concept?.length && compose.system) {
            const codeSystem = referencedCodeSystems[compose.system];
            const newConcepts = this.getConcepts(codeSystem, codeSystem.concept);
            // flatten so we can remove each existing concept before adding
            const existingConceptsFlat = flatMap(valueSet.expansion.contains, extractContained);
            // remove each existing concept from the set of new concepts, to avoid duplication
            existingConceptsFlat.forEach(existingConcept => {
              this.removeConcept(existingConcept, newConcepts);
            });
            // add whatever remains
            valueSet.expansion.contains.push(...newConcepts);
          }
        });
        valueSet.compose.exclude?.forEach(compose => {
          // remove specific excluded codes
          compose.concept?.forEach(concept => {
            this.removeConcept(
              { system: compose.system, code: concept.code },
              valueSet.expansion.contains
            );
          });
          // remove known excluded code systems
          // this is a little unusual to do, but we'll allow it.
          if (!compose.concept?.length && compose.system) {
            const codeSystem = referencedCodeSystems[compose.system];
            const conceptsToRemove = flatMap(this.getConcepts(codeSystem, codeSystem.concept));
            conceptsToRemove.forEach(concept =>
              this.removeConcept(concept, valueSet.expansion.contains)
            );
          }
        });
      }
    }
  }

  private isConceptPresent(
    target: ValueSetExpansionContains,
    concepts: ValueSetExpansionContains[]
  ): boolean {
    return concepts.some(
      concept =>
        (concept.code === target.code && concept.system === target.system) ||
        this.isConceptPresent(target, concept.contains ?? [])
    );
  }

  private getConcepts(system: any, concepts: any[]): ValueSetExpansionContains[] {
    return concepts.map(concept => {
      const contained: ValueSetExpansionContains = {
        system: system.url,
        code: concept.code
      };
      if (system.version) {
        contained.version = system.version;
      }
      if (concept.display) {
        contained.display = concept.display;
      }
      if (concept.concept?.length > 0) {
        contained.contains = this.getConcepts(system, concept.concept);
      }
      return contained;
    });
  }

  private removeConcept(target: ValueSetExpansionContains, concepts: ValueSetExpansionContains[]) {
    const targetIndex = concepts.findIndex(concept => {
      return concept.code === target.code && concept.system === target.system;
    });
    if (targetIndex > -1) {
      const [removedConcept] = concepts.splice(targetIndex, 1);
      if (removedConcept.contains?.length) {
        concepts.splice(targetIndex, 0, ...removedConcept.contains);
      }
    } else {
      concepts.forEach(concept => {
        if (concept.contains?.length) {
          this.removeConcept(target, concept.contains);
          if (concept.contains.length === 0) {
            delete concept.contains;
          }
        }
      });
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
    this.performExpansion(vs);

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

// If the minimum node version reaches 11 or higher, Array.prototype.flat becomes available
// and this can be reimplemented without needing lodash.
function extractContained(c: ValueSetExpansionContains): ValueSetExpansionContains[] {
  return [{ code: c.code, system: c.system }, ...flatMap(c.contains || [], extractContained)];
}
