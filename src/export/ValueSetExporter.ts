import { ValueSet, ValueSetCompose } from '../fhirtypes';
import { FSHTank } from '../import/FSHTank';
import { FHIRDefinitions } from '../fhirdefs/FHIRDefinitions';
import {
  FshValueSet,
  ValueSetComponent,
  ValueSetConceptComponent,
  ValueSetFilterComponent,
  FshCode
} from '../fshtypes';
import { logger } from '../utils/FSHLogger';
import { ValueSetComposeError } from '../errors';

export class ValueSetExporter {
  public readonly valueSets: ValueSet[] = [];
  constructor(public readonly FHIRDefs: FHIRDefinitions, public readonly tank: FSHTank) {}

  private setMetadata(valueSet: ValueSet, fshDefinition: FshValueSet): void {
    valueSet.name = fshDefinition.name;
    valueSet.id = fshDefinition.id;
    if (fshDefinition.title) {
      valueSet.title = fshDefinition.title;
    }
    if (fshDefinition.description) {
      valueSet.description = fshDefinition.description;
    }
    valueSet.url = `${this.tank.config.canonical}/ValueSet/${valueSet.id}`;
  }

  private setCompose(valueSet: ValueSet, components: ValueSetComponent[]) {
    if (components.length > 0) {
      valueSet.compose = {
        include: [],
        exclude: []
      };
      components.forEach(component => {
        const composeElement: ValueSetCompose = {};
        if (component.from.system) {
          composeElement.system = component.from.system;
        }
        if (component.from.valueSets) {
          composeElement.valueSet = component.from.valueSets;
        }
        if (component instanceof ValueSetConceptComponent) {
          composeElement.concept = [];
          component.concepts.forEach(concept => {
            composeElement.concept.push({
              code: concept.code,
              display: concept.display
            });
          });
        } else if (component instanceof ValueSetFilterComponent) {
          composeElement.filter = [];
          component.filters.forEach(filter => {
            composeElement.filter.push({
              property: filter.property.toString(),
              op: filter.operator.toString(),
              value: this.filterValueToString(filter.value)
            });
          });
        }
        if (component.inclusion) {
          valueSet.compose.include.push(composeElement);
        } else {
          valueSet.compose.exclude.push(composeElement);
        }
      });
    }
  }

  private filterValueToString(value: string | RegExp | boolean | FshCode): string {
    if (value instanceof RegExp) {
      return value.source;
    } else if (value instanceof FshCode) {
      return `${value.system}#${value.code}`;
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
