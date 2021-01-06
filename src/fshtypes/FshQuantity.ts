import { FshCode } from './FshCode';
import { FshEntity } from './FshEntity';
import { Quantity } from '../fhirtypes';

export class FshQuantity extends FshEntity {
  constructor(public value: number, public unit?: FshCode) {
    super();
  }

  toString(): string {
    let str = this.value.toString();
    if (this.unit?.code != null) {
      str += ` '${this.unit.code}'`;
      if (this.unit?.display != null) str += ` "${this.unit.display}"`;
    }
    return str;
  }

  toFHIRQuantity(): Quantity {
    const quantity: Quantity = {};
    if (this.value) {
      quantity.value = this.value;
    }
    if (this.unit?.code) {
      quantity.code = this.unit.code;
    }
    if (this.unit?.system) {
      quantity.system = this.unit.system;
    }
    if (this.unit?.display) {
      quantity.unit = this.unit.display;
    }
    return quantity;
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
