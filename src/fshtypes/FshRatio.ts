import { FshQuantity } from './FshQuantity';
import { FshEntity } from './FshEntity';

export class FshRatio extends FshEntity {
  constructor(public numerator: FshQuantity, public denominator: FshQuantity) {
    super();
  }

  toString() {
    return `${this.numerator.toString()} : ${this.denominator.toString()}`;
  }

  equals(other: FshRatio) {
    return this.numerator.equals(other.numerator) && this.denominator.equals(other.denominator);
  }
}
