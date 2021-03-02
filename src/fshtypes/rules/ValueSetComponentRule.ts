import { FshCode } from '../FshCode';
import { Rule } from './Rule';
import { ValueSetComponentFrom, ValueSetFilter } from '..';

export class ValueSetComponentRule extends Rule {
  public from: ValueSetComponentFrom = {};
  constructor(public inclusion: boolean) {
    super('');
  }

  get constructorName() {
    return 'ValueSetComponentRule';
  }
}

export class ValueSetConceptComponentRule extends ValueSetComponentRule {
  public concepts: FshCode[] = [];

  get constructorName() {
    return 'ValueSetConceptComponentRule';
  }
}

export class ValueSetFilterComponentRule extends ValueSetComponentRule {
  public filters: ValueSetFilter[] = [];

  get constructorName() {
    return 'ValueSetFilterComponentRule';
  }
}
