import { FshEntity } from './FshEntity';
import { FshCode } from './FshCode';

export class ValueSetComponent extends FshEntity {
  public from: ValueSetComponentFrom = {};
  constructor(public inclusion: boolean) {
    super();
  }
}

export class ValueSetConceptComponent extends ValueSetComponent {
  public concepts: FshCode[] = [];
}

export class ValueSetFilterComponent extends ValueSetComponent {
  public filters: ValueSetFilter[] = [];
}

export type ValueSetComponentFrom = {
  system?: string;
  valueSets?: string[];
};

export enum VsProperty {
  SYSTEM = 'system',
  VERSION = 'version',
  CODE = 'code',
  DISPLAY = 'display'
}

export enum VsOperator {
  EQUALS = '=',
  IS_A = 'is-a',
  DESCENDENT_OF = 'descendent-of',
  IS_NOT_A = 'is-not-a',
  REGEX = 'regex',
  IN = 'in',
  NOT_IN = 'not-in',
  GENERALIZES = 'generalizes',
  EXISTS = 'exists'
}

export type ValueSetFilter = {
  property: VsProperty;
  operator: VsOperator;
  value: string | RegExp | boolean | FshCode;
};
