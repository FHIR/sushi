import { FshEntity } from './FshEntity';

export class FshReference extends FshEntity {
  constructor(public reference: string, public display?: string) {
    super();
  }

  toString() {
    return `Reference(${this.reference})${this.display ? ` "${this.display}"` : ''}`;
  }

  equals(other: FshReference) {
    return this.reference === other.reference && this.display === other.display;
  }
}
