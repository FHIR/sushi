import { Rule } from './rules/Rule';

export class FshConcept extends Rule {
  constructor(public code: string, public display?: string, public definition?: string) {
    super('');
  }
}
