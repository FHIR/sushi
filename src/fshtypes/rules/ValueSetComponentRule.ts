import { FshCode } from '../FshCode';
import { Rule } from './Rule';
import { ValueSetComponentFrom, ValueSetFilter } from '..';

export class ValueSetComponentRule extends Rule {
  constructorName = 'ValueSetComponentRule';
  public from: ValueSetComponentFrom = {};
  constructor(public inclusion: boolean) {
    super('');
  }
}

export class ValueSetConceptComponentRule extends ValueSetComponentRule {
  constructorName = 'ValueSetConceptComponentRule';
  public concepts: FshCode[] = [];
}

export class ValueSetFilterComponentRule extends ValueSetComponentRule {
  constructorName = 'ValueSetFilterComponentRule';
  public filters: ValueSetFilter[] = [];
}
