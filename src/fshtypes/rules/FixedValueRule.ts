import { Rule } from './Rule';
import { Code, FshQuantity, FshRatio } from '../index';

export type FixedValueType = boolean | number | string | Code | FshQuantity | FshRatio;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;

  constructor(path: string) {
    super(path);
  }
}
