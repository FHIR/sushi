import { Rule } from './Rule';
import { AssignmentValueType } from './AssignmentRule';
import { FshCanonical } from '../FshCanonical';
import { FshCode } from '../FshCode';
import { FshQuantity } from '../FshQuantity';
import { FshRatio } from '../FshRatio';
import { FshReference } from '../FshReference';
import { fshifyString } from '../common';

export class CaretValueRule extends Rule {
  caretPath: string;
  value: AssignmentValueType;
  rawValue?: string;
  isInstance: boolean;
  isCodeCaretRule = false;
  pathArray: string[] = [];

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'CaretValueRule';
  }

  toFSH(): string {
    let value: string;
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
      value = this.rawValue ?? String(this.value);
    } else if (typeof this.value === 'string') {
      value = this.isInstance ? this.value : `"${fshifyString(this.value)}"`;
    } else if (this.value) {
      value = this.value._instanceMeta.name;
    }
    let printablePath: string;
    if (this.isCodeCaretRule) {
      if (this.pathArray.length) {
        printablePath =
          this.pathArray
            .map(code => {
              const splitCode = code.split('#');
              const systemPart = splitCode[0];
              const codePart = splitCode.slice(1).join('#');
              if (/^"|\s/.test(codePart)) {
                return `${systemPart}#"${fshifyString(codePart)}"`;
              } else {
                return `${systemPart}#${codePart}`;
              }
            })
            .join(' ') + ' ';
      } else {
        printablePath = '';
      }
    } else {
      printablePath = this.path !== '' ? this.path + ' ' : '';
    }
    return `* ${printablePath}^${this.caretPath} = ${value}`;
  }
}
