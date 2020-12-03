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
    let appliedContents = this.contents;
    this.parameters.forEach((parameter, index) => {
      appliedContents = appliedContents.replace(
        new RegExp(`{${escapeRegExp(parameter)}}`, 'g'),
        values[index] ?? ''
      );
    });
    return appliedContents;
  }
}
