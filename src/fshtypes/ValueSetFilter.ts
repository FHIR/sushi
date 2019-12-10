import { FshCode } from './FshCode';
import { FshEntity } from './FshEntity';

export abstract class ValueSetFilter extends FshEntity {
  public system: string;
  public property: string;

  withSystem(system: string) {
    this.system = system;
    return this;
  }

  withProperty(property: string) {
    this.property = property;
    return this;
  }
}

export class ValueSetEqualsFilter extends ValueSetFilter {
  public operand: string;
}

export class ValueSetIsAFilter extends ValueSetFilter {
  public operand: FshCode;
}

export class ValueSetDescendantFilter extends ValueSetFilter {
  public operand: FshCode;
}

export class ValueSetIsNotAFilter extends ValueSetFilter {
  public operand: FshCode;
}

export class ValueSetRegexFilter extends ValueSetFilter {
  public operand: string;
}

export class ValueSetInFilter extends ValueSetFilter {
  public operand: FshCode[];
}

export class ValueSetNotInFilter extends ValueSetFilter {
  public operand: FshCode[];
}

export class ValueSetGeneralizesFilter extends ValueSetFilter {
  public operand: FshCode;
}

export class ValueSetExistsFilter extends ValueSetFilter {
  public operand: string;
}
