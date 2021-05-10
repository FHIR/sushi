import { Rule } from './Rule';

export class InsertRule extends Rule {
  ruleSet: string;
  params: string[];

  constructor() {
    super('');
    this.params = [];
  }

  get constructorName() {
    return 'InsertRule';
  }

  private fshifyParameters(): string {
    return this.params
      .map(originalParam => {
        return originalParam.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/\)/g, '\\)');
      })
      .join(', ');
  }

  toFSH(): string {
    const paramPart = this.params.length > 0 ? `(${this.fshifyParameters()})` : '';
    return `* insert ${this.ruleSet}${paramPart}`;
  }
}
