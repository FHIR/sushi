import { FshEntity } from './FshEntity';
import { CaretValueRule, InsertRule, ConceptRule } from './rules';
import { EOL } from 'os';
import { fshifyString, findIdCaretRule } from './common';

/**
 * For more information about a CodeSystem in FHIR,
 * @see {@link http://hl7.org/fhir/codesystem-definitions.html}
 */
export class FshCodeSystem extends FshEntity {
  private _id: string;
  title?: string;
  description?: string;
  rules: (ConceptRule | CaretValueRule | InsertRule)[];

  constructor(public name: string) {
    super();
    this.id = name;
    this.rules = [];
  }

  get constructorName() {
    return 'FshCodeSystem';
  }

  get id() {
    const idCaretRule = findIdCaretRule(this.rules);
    if (idCaretRule) {
      return idCaretRule.value.toString();
    }
    return this._id;
  }

  set id(id: string) {
    this._id = id;
  }

  metadataToFSH(): string {
    const resultLines: string[] = [];
    resultLines.push(`CodeSystem: ${this.name}`);
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
    return resultLines.join(EOL);
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
