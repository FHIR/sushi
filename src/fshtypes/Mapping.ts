import { FshEntity } from '.';
import { InsertRule, MappingRule } from './rules';
import { EOL } from 'os';
import { fshifyString } from './common';

/**
 * The Mapping class is used to contain mapping info for SDs
 */
export class Mapping extends FshEntity {
  id: string;
  source?: string;
  target?: string;
  description?: string;
  title?: string;
  rules: (MappingRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }

  get constructorName() {
    return 'Mapping';
  }

  metadataToFSH(): string {
    const resultLines: string[] = [];
    resultLines.push(`Mapping: ${this.name}`);
    resultLines.push(`Id: ${this.id}`);
    if (this.title) {
      resultLines.push(`Title: "${fshifyString(this.title)}"`);
    }
    if (this.description) {
      // Description can be a multiline string.
      // If it contains newline characters, treat it as a multiline string.
      if (this.description.indexOf('\n') > -1) {
        resultLines.push(`Description: """${this.description}"""`);
      } else {
        resultLines.push(`Description: "${fshifyString(this.description)}"`);
      }
    }
    if (this.source) {
      resultLines.push(`Source: ${this.source}`);
    }
    if (this.target) {
      resultLines.push(`Target: "${fshifyString(this.target)}"`);
    }
    return resultLines.join(EOL);
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
