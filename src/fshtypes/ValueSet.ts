import { FshEntity } from './FshEntity';
import { FshCode } from './FshCode';

export class ValueSet extends FshEntity {
  id: string;
  description?: string;
  codes: FshCode[];
  includesDescendants: FshCode[];
  excludesDescendants: FshCode[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.codes = [];
    this.includesDescendants = [];
    this.excludesDescendants = [];
  }
}
