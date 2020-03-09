import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../index';

export type FixedValueType =
  | boolean
  | number
  | string
  | FshCode
  | FshQuantity
  | FshRatio
  | FshReference;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;
  units: boolean;

  constructor(path: string) {
    super(path);
  }
}
