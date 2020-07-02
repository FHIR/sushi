import { FshEntity } from './FshEntity';

export class FshCanonical extends FshEntity {
  public sdType: string;
  constructor(public entityName: string) {
    super();
  }

  toString(): string {
    return `Canonical(${this.entityName})`;
  }
}
