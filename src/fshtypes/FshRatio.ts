import { FshQuantity } from './FshQuantity';

export class FshRatio {
  constructor(public numerator: FshQuantity, public denominator: FshQuantity) {}

  toString() {
    return `${this.numerator.toString()} : ${this.denominator.toString()}`;
  }

  equals(other: FshRatio) {
    return this.numerator.equals(other.numerator) && this.denominator.equals(other.denominator);
  }
}
