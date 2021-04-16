import { FshEntity } from '.';
import { InsertRule, MappingRule, PathRule } from './rules';

/**
 * The Mapping class is used to contain mapping info for SDs
 */
export class Mapping extends FshEntity {
  id: string;
  source?: string;
  target?: string;
  description?: string;
  title?: string;
  rules: (MappingRule | InsertRule | PathRule)[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }

  get constructorName() {
    return 'Mapping';
  }
}
