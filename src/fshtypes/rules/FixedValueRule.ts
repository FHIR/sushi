import { Rule } from './Rule';
import { Code, Quantity, Ratio } from '../index';

export type FixedValueType = boolean | number | string | Code | Quantity | Ratio;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;

  constructor(path: string) {
    super(path);
  }
}
