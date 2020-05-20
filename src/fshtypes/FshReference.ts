import { FshEntity } from './FshEntity';
import { Reference } from '../fhirtypes';

export class FshReference extends FshEntity {
  public sdType: string;
  constructor(public reference: string, public display?: string) {
    super();
  }

  toString(): string {
    return `Reference(${this.reference})${this.display ? ` "${this.display}"` : ''}`;
  }

  toFHIRReference(): Reference {
    const reference: Reference = {
      reference: this.reference
    };
    if (this.display) {
      reference.display = this.display;
    }
    return reference;
  }

  equals(other: FshReference, ignoreOtherDisplay = false) {
    return (
      this.reference === other.reference &&
      (this.display == other.display || (ignoreOtherDisplay && other.display == null))
    );
  }
}
