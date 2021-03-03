import { Rule } from './Rule';

export class ConceptRule extends Rule {
  // Allow a system, even though it is unused, to help resolve conflicts between ConceptRule and
  // ValueSetConceptComponentRule on RuleSets
  system: string;
  constructor(public code: string, public display?: string, public definition?: string) {
    super('');
  }

  get constructorName() {
    return 'ConceptRule';
  }
}
