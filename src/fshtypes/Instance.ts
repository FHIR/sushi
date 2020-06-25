import { FixedValueRule, InsertRule } from './rules';
import { FshEntity } from './FshEntity';

export class Instance extends FshEntity {
  id: string;
  title?: string;
  instanceOf: string;
  description?: string;
  usage?: InstanceUsage;
  mixins?: string[];
  rules: (FixedValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.mixins = [];
    this.rules = [];
    this.usage = 'Example'; // init to Example (default)
  }
}

export type InstanceUsage = 'Example' | 'Definition' | 'Inline';

export function isInstanceUsage(s: string): s is InstanceUsage {
  return ['Example', 'Definition', 'Inline'].indexOf(s) >= 0;
}
