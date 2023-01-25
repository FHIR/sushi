import { FshEntity } from './FshEntity';
import { Rule } from './rules';
import { EOL } from 'os';
import { fshifyString, findIdCaretRule } from './common';

export abstract class FshStructure extends FshEntity {
  private _id: string;
  parent?: string;
  title?: string;
  description?: string;
  rules: Rule[];

  constructor(public name: string) {
    super();
    this.id = name; // init same as name
    this.rules = [];
  }

  get constructorName() {
    return 'FshStructure';
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
    resultLines.push(`${this.constructorName}: ${this.name}`);
    if (this.parent) {
      resultLines.push(`Parent: ${this.parent}`);
    }
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
}
