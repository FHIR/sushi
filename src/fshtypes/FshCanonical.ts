import { FshEntity } from './FshEntity';

export class FshCanonical extends FshEntity {
  version: string;
  useEntityVersion: boolean;
  constructor(public entityName: string) {
    super();
    this.useEntityVersion = false;
  }

  toString(): string {
    const versionText = this.useEntityVersion ? 'version' : this.version;
    return `Canonical(${this.entityName}${versionText ? `|${versionText}` : ''})`;
  }
}
