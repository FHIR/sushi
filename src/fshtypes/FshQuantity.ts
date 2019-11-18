import { FshCode } from './FshCode';

export class FshQuantity {
  constructor(public value: number, public unit?: FshCode) {}

  toString() {
    let str = this.value.toString();
    if (this.unit?.code != null) str += ` '${this.unit.code}'`;
    return str;
  }

  equals(other: FshQuantity) {
    return (
      this.value === other.value &&
      this.unit?.code === other.unit?.code &&
      this.unit?.system === other.unit?.system &&
      this.unit?.display === other.unit?.display
    );
  }
}
