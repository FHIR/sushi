import { Rule } from './Rule';
import { fshifyString } from '../common';

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

  toFSH(): string {
    let line = `* #${/\s/.test(this.code) ? `"${this.code}"` : this.code}`;
    if (this.display) {
      line += ` "${fshifyString(this.display)}"`;
    }
    if (this.definition) {
      // If there is no display, a definition must be specified with triple quotes
      // so that it is correctly differentiated from a display by sushi
      const quotes = this.display ? '"' : '"""';
      line += ` ${quotes}${fshifyString(this.definition)}${quotes}`;
    }
    return line;
  }
}
