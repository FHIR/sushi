import { Rule } from './Rule';
import { FshCode } from '../FshCode';
import { FshQuantity } from '../FshQuantity';
import { FshRatio } from '../FshRatio';
import { FshReference } from '../FshReference';
import { InstanceDefinition } from '../../fhirtypes/InstanceDefinition';
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
  rawValue?: string;
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
    if (
      typeof this.value === 'boolean' ||
      typeof this.value === 'number' ||
      typeof this.value === 'bigint'
    ) {
      printableValue = this.rawValue ?? String(this.value);
    } else if (typeof this.value === 'string') {
      printableValue = this.isInstance ? this.value : `"${fshifyString(this.value)}"`;
    } else if (
      this.value instanceof FshCode ||
      this.value instanceof FshQuantity ||
      this.value instanceof FshRatio ||
      this.value instanceof FshReference ||
      this.value instanceof FshCanonical
    ) {
      printableValue = this.value.toString();
    } else {
      printableValue = this.value.id;
    }

    return `* ${this.path} = ${printableValue}${this.exactly ? ' (exactly)' : ''}`;
  }
}
