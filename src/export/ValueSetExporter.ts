import { ValueSet, ValueSetComposeIncludeOrExclude, ValueSetComposeConcept } from '../fhirtypes';
import { FSHTank } from '../import/FSHTank';
import {
  FshValueSet,
  ValueSetComponent,
  ValueSetConceptComponent,
  ValueSetFilterComponent,
  FshCode,
  ValueSetFilterValue
} from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { ValueSetComposeError } from '../errors';

export class ValueSetExporter {
  public readonly valueSets: ValueSet[] = [];
  constructor(public readonly tank: FSHTank) {}

  private setMetadata(valueSet: ValueSet, fshDefinition: FshValueSet): void {
    valueSet.name = fshDefinition.name;
    valueSet.id = fshDefinition.id;
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

  private setCompose(valueSet: ValueSet, components: ValueSetComponent[]) {
    if (components.length > 0) {
      valueSet.compose = {
        include: [],
        exclude: []
      };
      components.forEach(component => {
        const composeElement: ValueSetComposeIncludeOrExclude = {};
        if (component.from.system) {
          composeElement.system = component.from.system;
        }
        if (component.from.valueSets) {
          composeElement.valueSet = component.from.valueSets;
        }
        if (component instanceof ValueSetConceptComponent && component.concepts.length > 0) {
          composeElement.concept = component.concepts.map(concept => {
            const composeConcept: ValueSetComposeConcept = {
              code: concept.code
            };
            if (concept.display) {
              composeConcept.display = concept.display;
            }
            return composeConcept;
          });
        } else if (component instanceof ValueSetFilterComponent && component.filters.length > 0) {
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

  private filterValueToString(value: ValueSetFilterValue): string {
    if (value instanceof RegExp) {
      return value.source;
    } else if (value instanceof FshCode) {
      return value.code;
    } else {
      return value.toString();
    }
  }

  export(): ValueSet[] {
    for (const valueSet of this.tank.getAllValueSets()) {
      try {
        this.exportValueSet(valueSet);
      } catch (e) {
        logger.error(e.message, valueSet.sourceInfo);
      }
    }
    return this.valueSets;
  }

  exportValueSet(fshDefinition: FshValueSet): void {
    if (this.valueSets.some(vs => vs.name === fshDefinition.name)) {
      return;
    }
    const vs = new ValueSet();
    this.setMetadata(vs, fshDefinition);
    this.setCompose(vs, fshDefinition.components);
    if (vs.compose && vs.compose.include.length == 0) {
      throw new ValueSetComposeError(fshDefinition.name);
    }
    this.valueSets.push(vs);
  }
}
