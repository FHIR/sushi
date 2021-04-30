import { Rule } from './Rule';
import { EOL } from 'os';

export class ContainsRule extends Rule {
  items: ContainsRuleItem[];

  constructor(path: string) {
    super(path);
    this.items = [];
  }

  get constructorName() {
    return 'ContainsRule';
  }

  toFSH(): string {
    const itemsWithAssociatedRules = this.items.map(item => {
      let line = '';

      // Add contains rule info
      if (item.type) {
        line += `${item.type} named ${item.name}`;
      } else {
        line += `${item.name}`;
      }
      // Add a cardinality for syntactic correctness.
      // A later CardRule on this element should provide the correct cardinality.
      line += ' 0..';
      return line;
    });

    return `* ${this.path} contains${
      itemsWithAssociatedRules.length > 1 ? `${EOL}    ` : ' '
    }${itemsWithAssociatedRules.join(` and${EOL}    `)}`; // New line and indent each
  }
}

export type ContainsRuleItem = {
  name: string;
  type?: string;
};
