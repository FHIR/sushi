import { FshCode } from '../FshCode';
import { Rule } from './Rule';
import { ValueSetComponentFrom, ValueSetFilter } from '..';

export class ValueSetComponentRule extends Rule {
  public from: ValueSetComponentFrom = {};
  constructor(public inclusion: boolean) {
    super('');
  }
}

export class ValueSetConceptComponentRule extends ValueSetComponentRule {
  public concepts: FshCode[] = [];
}

export class ValueSetFilterComponentRule extends ValueSetComponentRule {
  public filters: ValueSetFilter[] = [];
}
