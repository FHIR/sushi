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

  getUnusedParameters() {
    return this.parameters.filter(param => {
      return !new RegExp(`{\\s*${escapeRegExp(param)}\\s*}`).test(this.contents);
    });
  }
}
