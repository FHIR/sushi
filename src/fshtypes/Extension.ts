import { Rule } from './rules/Rule';
import { FshEntity } from './FshEntity';

export class Extension extends FshEntity {
  id: string;
  parent: string;
  title?: string;
  description?: string;
  mixins?: string[];
  rules: Rule[];

  constructor(public name: string) {
    super();
    // Init id to be same as name.  This can be overridden using FSH syntax (Id: keyword)
    this.id = name;
    // Init the parent to 'Extension', as this is what 99% of extensions do.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'Extension'; // init to 'Extension'
    this.mixins = [];
    this.rules = [];
  }
}
