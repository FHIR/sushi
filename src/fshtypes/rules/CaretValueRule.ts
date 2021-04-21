import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';
import { FshCanonical } from '../FshCanonical';
import { FshCode } from '../FshCode';
import { FshQuantity } from '../FshQuantity';
import { FshRatio } from '../FshRatio';
import { FshReference } from '../FshReference';
import { EOL } from 'os';

export class CaretValueRule extends Rule {
  caretPath: string;
  value: AssignmentValueType;
  isInstance: boolean;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'CaretValueRule';
  }

  toFSH(): string {
    let value;
    if (
      this.value instanceof FshCanonical ||
      this.value instanceof FshCode ||
      this.value instanceof FshQuantity ||
      this.value instanceof FshRatio ||
      this.value instanceof FshReference
    ) {
      value = this.value.toString();
    } else if (
      typeof this.value === 'boolean' ||
      typeof this.value === 'number' ||
      typeof this.value === 'bigint'
    ) {
      value = this.value;
    } else if (typeof this.value === 'string') {
      value = this.isInstance ? this.value : `"${this.value}"`;
    } else if (this.value) {
      value = this.value._instanceMeta.name;
    }
    const lines: string[] = [];
    lines.push(`* ${this.path !== '' ? this.path + ' ' : ''}^${this.caretPath} = ${value}`);
    return lines.join(EOL);
  }
}
