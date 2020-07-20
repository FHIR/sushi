import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../index';
import { InstanceDefinition } from '../../fhirtypes';
import { FshCanonical } from '../FshCanonical';

export type FixedValueType =
  | boolean
  | number
  | string
  | FshCanonical
  | FshCode
  | FshQuantity
  | FshRatio
  | FshReference
  | InstanceDefinition;

export class FixedValueRule extends Rule {
  fixedValue: FixedValueType;
  exactly: boolean;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }
}
