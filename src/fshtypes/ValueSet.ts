import { FshEntity } from './FshEntity';
import { FshCode } from './FshCode';
import { ValueSetTerm } from './ValueSetTerm';

export class ValueSet extends FshEntity {
  id: string;
  description?: string;
  codes: ValueSetTerm[];
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
