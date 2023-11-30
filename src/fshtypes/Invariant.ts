import { FshEntity, FshCode } from '.';
import { AssignmentRule, InsertRule } from './rules';
import { EOL } from 'os';
import { fshifyString } from './common';

/**
 * The Invariant class is used to represent the "constraint" field on ElementDefinition
 * Invariant fields map to their corresponding field on "constraint" except:
 * description -> constraint.human
 * name -> constraint.key
 * @see {@link https://www.hl7.org/fhir/elementdefinition.html}
 */
export class Invariant extends FshEntity {
  description?: string;
  expression?: string;
  xpath?: string;
  severity?: FshCode;
  rules: (AssignmentRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.rules = [];
  }

  get constructorName() {
    return 'Invariant';
  }

  /**
   * Read only property for id that just returns the name of the invariant
   * This was added so that all types that are returned by FSHTank.fish have an id that can be accessed
   */
  get id() {
    return this.name;
  }

  metadataToFSH(): string {
    const resultLines: string[] = [];
    resultLines.push(`Invariant: ${this.name}`);
    if (this.description) {
      // Description can be a multiline string.
      // If it contains newline characters, treat it as a multiline string.
      if (this.description.indexOf('\n') > -1) {
        resultLines.push(`Description: """${this.description}"""`);
      } else {
        resultLines.push(`Description: "${fshifyString(this.description)}"`);
      }
    }
    if (this.severity) {
      resultLines.push(`* severity = ${this.severity}`);
    }
    if (this.expression) {
      resultLines.push(`* expression = "${fshifyString(this.expression)}"`);
    }
    if (this.xpath) {
      resultLines.push(`* xpath = "${fshifyString(this.xpath)}"`);
    }
    return resultLines.join(EOL);
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
