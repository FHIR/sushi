import { Rule } from './rules/Rule';

export class FshConcept extends Rule {
  // Allow a system, even though it is unused, to help resolve conflicts between FshConcepts and
  // ValueSetConceptComponents on RuleSets
  system: string;
  constructor(public code: string, public display?: string, public definition?: string) {
    super('');
  }
}
