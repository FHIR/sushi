import { Rule } from './Rule';
import { FshCode, FshQuantity, FshRatio, FshReference } from '../index';
import { InstanceDefinition } from '../../fhirtypes';
import { FshCanonical } from '../FshCanonical';
import { fshifyString } from '../common';

export type AssignmentValueType =
  | boolean
  | number
  | bigint
  | string
  | FshCanonical
  | FshCode
  | FshQuantity
  | FshRatio
  | FshReference
  | InstanceDefinition;

export class AssignmentRule extends Rule {
  value: AssignmentValueType;
  exactly: boolean;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'AssignmentRule';
  }

  toFSH(): string {
    let printableValue = '';
    if (typeof this.value === 'boolean' || typeof this.value === 'number') {
      printableValue = String(this.value);
    } else if (typeof this.value === 'string') {
      printableValue = this.isInstance ? this.value : `"${fshifyString(this.value)}"`;
    } else if (
      this.value instanceof FshCode ||
      this.value instanceof FshQuantity ||
      this.value instanceof FshRatio ||
      this.value instanceof FshReference
    ) {
      printableValue = this.value.toString();
    } else if (this.value instanceof InstanceDefinition) {
      printableValue = this.value.id;
    }

    return `* ${this.path} = ${printableValue}${this.exactly ? ' (exactly)' : ''}`;
  }
}
