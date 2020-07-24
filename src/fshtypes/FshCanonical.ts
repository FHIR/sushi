import { FshEntity } from './FshEntity';

export class FshCanonical extends FshEntity {
  version: string;
  constructor(public entityName: string) {
    super();
  }

  toString(): string {
    return `Canonical(${this.entityName}${this.version ? `|${this.version}` : ''})`;
  }
}
