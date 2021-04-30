import { Rule } from './Rule';

export class ConceptRule extends Rule {
  // Allow a system, even though it is unused, to help resolve conflicts between ConceptRule and
  // ValueSetConceptComponentRule on RuleSets
  system: string;
  // Hierarchical codes may be contained within other codes. A top-level code will have an empty hierarchy.
  hierarchy: string[];
  constructor(public code: string, public display?: string, public definition?: string) {
    super('');
    this.hierarchy = [];
  }

  get constructorName() {
    return 'ConceptRule';
  }
}
