import { Rule } from './Rule';
import { FshCode } from '../FshCode';
import { fshifyString } from '../common';

export class MappingRule extends Rule {
  map: string;
  language?: FshCode;
  comment?: string;

  constructor(path: string) {
    super(path);
  }

  get constructorName() {
    return 'MappingRule';
  }

  toFSH(): string {
    const path = this.path ? ` ${this.path}` : '';
    let comment = '';
    if (this.comment) {
      // If the comment contains newlines, use multiline string syntax
      if (this.comment.indexOf('\n') > -1) {
        comment = ` """${this.comment}"""`;
      } else {
        comment = ` "${fshifyString(this.comment)}"`;
      }
    }
    const language = this.language ? ` ${this.language.toString()}` : '';
    return `*${path} -> "${fshifyString(this.map)}"${comment}${language}`;
  }
}
