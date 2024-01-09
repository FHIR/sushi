import { Rule } from './Rule';
import { fshifyString } from '../common';

export class ConceptRule extends Rule {
  // Allow a system, even though it is unused, to help resolve conflicts between ConceptRule and
  // ValueSetConceptComponentRule on RuleSets
  system: string;
  // Hierarchical codes may be contained within other codes. A top-level code will have an empty hierarchy.
  hierarchy: string[];
  constructor(
    public code: string,
    public display?: string,
    public definition?: string
  ) {
    super('');
    this.hierarchy = [];
  }

  get constructorName() {
    return 'ConceptRule';
  }

  toFSH(): string {
    // quote codes that contain spaces or start with a double quote
    const quotedCodes = [...this.hierarchy, this.code].map(code =>
      /^"|\s/.test(code) ? `#"${fshifyString(code)}"` : `#${code}`
    );
    let line = `* ${quotedCodes.join(' ')}`;
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
