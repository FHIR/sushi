import { AssignmentRule, InsertRule, PathRule } from './rules';
import { FshEntity } from './FshEntity';

export class Instance extends FshEntity {
  id: string;
  title?: string;
  instanceOf: string;
  description?: string;
  usage?: InstanceUsage;
  mixins?: string[];
  rules: (AssignmentRule | InsertRule | PathRule)[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.mixins = [];
    this.rules = [];
    this.usage = 'Example'; // init to Example (default)
  }

  get constructorName() {
    return 'Instance';
  }
}

export type InstanceUsage = 'Example' | 'Definition' | 'Inline';

export function isInstanceUsage(s: string): s is InstanceUsage {
  return ['Example', 'Definition', 'Inline'].indexOf(s) >= 0;
}
