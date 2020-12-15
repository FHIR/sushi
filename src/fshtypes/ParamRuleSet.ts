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
    const paramUsage = new RegExp(`{(${this.parameters.map(escapeRegExp).join('|')})}`, 'g');
    return this.contents.replace(paramUsage, (_fullMatch, paramName) => {
      const matchIndex = this.parameters.indexOf(paramName);
      if (matchIndex > -1) {
        return values[matchIndex];
      } else {
        return '';
      }
    });
  }

  getUnusedParameters() {
    return this.parameters.filter(param => {
      return this.contents.indexOf(`{${param}}`) === -1;
    });
  }
}
