import { FshEntity } from './FshEntity';
import { FshCode } from './FshCode';

export class ValueSet extends FshEntity {
  id: string;
  description?: string;
  codes: FshCode[];
  includesDescendents: FshCode[];
  excludesDescendents: FshCode[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.codes = [];
    this.includesDescendents = [];
    this.excludesDescendents = [];
  }
}
