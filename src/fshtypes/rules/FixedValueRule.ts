import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../index';
import { InstanceDefinition } from '../../fhirtypes';

export type FixedValueType =
  | boolean
  | number
  | string
  | FshCode
  | FshQuantity
  | FshRatio
  | FshReference
  | InstanceDefinition;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;
  isResource: boolean;

  constructor(path: string) {
    super(path);
  }
}
