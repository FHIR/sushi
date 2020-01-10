import { FshEntity } from './FshEntity';

export class FshReference extends FshEntity {
  constructor(public reference: string, public display?: string) {
    super();
  }

  toString() {
    return `Reference(${this.reference})${this.display ? ` "${this.display}"` : ''}`;
  }

  equals(other: FshReference, ignoreOtherDisplay = false) {
    return (
      this.reference === other.reference &&
      (this.display == other.display || (ignoreOtherDisplay && other.display == null))
    );
  }
}
