import { FshCode } from '../FshCode';
import { Rule } from './Rule';
import { ValueSetComponentFrom, ValueSetFilter } from '..';
import { EOL } from 'os';

export class ValueSetComponentRule extends Rule {
  public from: ValueSetComponentFrom = {};
  constructor(public inclusion: boolean) {
    super('');
  }

  get constructorName() {
    return 'ValueSetComponentRule';
  }

  toFSH(): string {
    return `* ${this.inclusion ? 'include' : 'exclude'} codes${fromString(this.from)}`;
  }
}

export class ValueSetConceptComponentRule extends ValueSetComponentRule {
  public concepts: FshCode[] = [];

  get constructorName() {
    return 'ValueSetConceptComponentRule';
  }

  toFSH() {
    // if this rule has valueSets in its "from" definition, write using the typical syntax
    // otherwise, write each code on its own line, and omit "include" and "from system"
    if (this.from.valueSets?.length > 0) {
      const inclusionPart = `* ${this.inclusion ? 'include' : 'exclude'} `;
      let conceptPart = this.concepts.map(concept => concept.toString()).join(' and ');
      let fromPart = fromString(this.from);
      // if the result is more than 100 characters long, build it again, but with linebreaks
      if (inclusionPart.length + conceptPart.length + fromPart.length > 100) {
        conceptPart = this.concepts.map(concept => concept.toString()).join(` and${EOL}    `);
        fromPart = `${EOL}   ` + fromString(this.from, ` and${EOL}    `);
      }
      return `${inclusionPart}${conceptPart}${fromPart}`;
    } else {
      const inclusionPart = `* ${this.inclusion ? '' : 'exclude '}`;
      return this.concepts
        .map(concept => {
          if (!concept.system && this.from.system) {
            concept.system = this.from.system;
          }

          return `${inclusionPart}${concept}`;
        })
        .join(EOL);
    }
  }
}

export class ValueSetFilterComponentRule extends ValueSetComponentRule {
  public filters: ValueSetFilter[] = [];

  get constructorName() {
    return 'ValueSetFilterComponentRule';
  }

  toFSH() {
    const inclusionPart = `* ${this.inclusion ? 'include' : 'exclude'} codes`;
    let fromPart = fromString(this.from);
    let filterPart = this.buildFilterString();
    // if the result is more than 100 characters long, build it again, but with linebreaks
    if (inclusionPart.length + fromPart.length + filterPart.length > 100) {
      fromPart = fromString(this.from, ` and${EOL}    `);
      filterPart = `${EOL}   ` + this.buildFilterString(` and${EOL}    `);
    }
    return `${inclusionPart}${fromPart}${filterPart}`;
  }

  private buildFilterString(separator = ' and '): string {
    if (this.filters.length) {
      return (
        ' where ' +
        this.filters
          .map(
            filter =>
              `${filter.property} ${filter.operator} ${
                typeof filter.value === 'string'
                  ? `"${filter.value.toString()}"`
                  : filter.value.toString()
              }`
          )
          .join(separator)
      );
    } else {
      return '';
    }
  }
}

function fromString(from: ValueSetComponentFrom, separator = ' and ') {
  if (from.system == null && from.valueSets == null) return '';
  let fromString = ' from ';
  if (from.system) {
    fromString += `system ${from.system}`;
  }
  if (from.valueSets) {
    fromString += `${from.system ? separator : ''}valueset ${from.valueSets.join(separator)}`;
  }
  return fromString;
}
