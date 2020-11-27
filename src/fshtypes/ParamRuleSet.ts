import { FshEntity } from '.';

export class ParamRuleSet extends FshEntity {
  parameters: string[];
  contents: string;

  constructor(public name: string) {
    super();
    this.parameters = [];
    this.contents = '';
  }
}
