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

export type ValueSetFilter = {
  property: string;
  operator: string;
  value: string | string[];
};
