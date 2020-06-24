import { FshCode } from '.';

export type ValueSetComponentFrom = {
  system?: string;
  valueSets?: string[];
};

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
  property: string;
  operator: VsOperator;
  value: ValueSetFilterValue;
};

export type ValueSetFilterValue = string | RegExp | boolean | FshCode;
