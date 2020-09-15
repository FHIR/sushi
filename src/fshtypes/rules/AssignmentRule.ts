import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../index';
import { InstanceDefinition } from '../../fhirtypes';
import { FshCanonical } from '../FshCanonical';

export type AssignmentValueType =
  | boolean
  | number
  | string
  | FshCanonical
  | FshCode
  | FshQuantity
  | FshRatio
  | FshReference
  | InstanceDefinition;

export class AssignmentRule extends Rule {
  fixedValue: AssignmentValueType;
  exactly: boolean;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }
}
