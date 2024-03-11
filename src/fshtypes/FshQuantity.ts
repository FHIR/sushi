import { FshCode } from './FshCode';
import { FshEntity } from './FshEntity';
import { Quantity } from '../fhirtypes';
import { fshifyString } from './common';

export class FshQuantity extends FshEntity {
  constructor(
    public value: number,
    public unit?: FshCode
  ) {
    super();
  }

  toString(): string {
    const stringParts: string[] = [];
    if (this.value != null) {
      stringParts.push(this.value.toString());
    }
    if (this.unit?.code != null) {
      if (this.unit?.system == 'http://unitsofmeasure.org') {
        stringParts.push(`'${this.unit.code}'`);
        if (this.unit.display) {
          stringParts.push(`"${fshifyString(this.unit.display)}"`);
        }
      } else {
        stringParts.push(`${this.unit.toString()}`);
      }
    }
    return stringParts.join(' ');
  }

  toFHIRQuantity(): Quantity {
    const quantity: Quantity = {};
    if (this.value != null) {
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
