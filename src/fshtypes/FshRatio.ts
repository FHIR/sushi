import { FshQuantity } from './FshQuantity';
import { FshEntity } from './FshEntity';
import { Ratio } from '../fhirtypes';

export class FshRatio extends FshEntity {
  constructor(public numerator: FshQuantity, public denominator: FshQuantity) {
    super();
  }

  toString(): string {
    return `${this.numerator.toString()} : ${this.denominator.toString()}`;
  }

  toFHIRRatio(): Ratio {
    const ratio: Ratio = {};
    if (this.numerator) {
      ratio.numerator = this.numerator.toFHIRQuantity();
    }
    if (this.denominator) {
      ratio.denominator = this.denominator.toFHIRQuantity();
    }
    return ratio;
  }

  equals(other: FshRatio) {
    return this.numerator.equals(other.numerator) && this.denominator.equals(other.denominator);
  }
}
