import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio } from '../index';

export type FixedValueType = boolean | number | string | FshCode | FshQuantity | FshRatio;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;

  constructor(path: string) {
    super(path);
  }
}
