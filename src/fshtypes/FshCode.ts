import { FshEntity } from './FshEntity';
import { Coding, CodeableConcept, Quantity } from '../fhirtypes';

export class FshCode extends FshEntity {
  constructor(public code: string, public system?: string, public display?: string) {
    super();
  }

  toString(): string {
    const str = `${this.system ?? ''}#${this.code}`;
    return this.display ? `${str} "${this.display}"` : str;
  }

  toFHIRCoding(): Coding {
    const coding: Coding = {};
    if (this.code) {
      coding.code = this.code;
    }
    if (this.system) {
      if (this.system.indexOf('|') > -1) {
        [coding.system, coding.version] = this.system.split('|', 2);
      } else {
        coding.system = this.system;
      }
    }
    if (this.display) {
      coding.display = this.display;
    }
    return coding;
  }

  toFHIRCodeableConcept(): CodeableConcept {
    return {
      coding: [this.toFHIRCoding()]
    };
  }

  toFHIRQuantity(): Quantity {
    const quantity: Quantity = {};
    if (this.code) {
      quantity.code = this.code;
    }
    if (this.system) {
      quantity.system = this.system;
    }
    if (this.display) {
      quantity.unit = this.display;
    }
    return quantity;
  }
}
