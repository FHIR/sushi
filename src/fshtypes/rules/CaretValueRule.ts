import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';
import { FshCanonical, FshCode, FshQuantity, FshRatio, FshReference } from '..';
import { InstanceDefinition } from '../../fhirtypes';
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
    } else if (this.value instanceof InstanceDefinition) {
      value = this.value._instanceMeta.name;
    } else if (typeof this.value === 'boolean' || typeof this.value === 'number') {
      value = this.value;
    } else if (typeof this.value === 'string') {
      value = this.isInstance ? this.value : `"${this.value}"`;
    }
    const lines: string[] = [];
    lines.push(`* ${this.path !== '' ? this.path + ' ' : ''}^${this.caretPath} = ${value}`);
    return lines.join(EOL);
  }
}
