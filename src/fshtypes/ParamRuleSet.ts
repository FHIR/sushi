import escapeRegExp from 'lodash/escapeRegExp';
import { FshEntity } from '.';

export class ParamRuleSet extends FshEntity {
  parameters: string[];
  contents: string;

  constructor(public name: string) {
    super();
    this.parameters = [];
    this.contents = '';
  }

  applyParameters(values: string[]): string {
    const escapedParameters = this.parameters.map(escapeRegExp).join('|');
    const paramUsage = new RegExp(
      `\\[\\[{\\s*(${escapedParameters})\\s*}\\]\\]|{\\s*(${escapedParameters})\\s*}`,
      'g'
    );
    return this.contents.replace(paramUsage, (fullMatch, bracketParamName, paramName) => {
      if (fullMatch.startsWith('[')) {
        const matchIndex = this.parameters.indexOf(bracketParamName);
        if (matchIndex > -1) {
          return `[[${values[matchIndex].replace(/\]\],/g, ']]\\,').replace(/\]\]\)/g, ']]\\)')}]]`;
        } else {
          return '';
        }
      } else {
        const matchIndex = this.parameters.indexOf(paramName);
        if (matchIndex > -1) {
          return values[matchIndex];
        } else {
          return '';
        }
      }
    });
  }

  getUnusedParameters() {
    return this.parameters.filter(param => {
      return !new RegExp(`{\\s*${escapeRegExp(param)}\\s*}`).test(this.contents);
    });
  }
}
