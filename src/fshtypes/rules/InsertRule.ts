import { Rule } from './Rule';

export class InsertRule extends Rule {
  ruleSet: string;
  params: string[];
  pathArray: string[] = [];

  constructor(path: string) {
    super(path);
    this.params = [];
  }

  get constructorName() {
    return 'InsertRule';
  }

  private fshifyParameters(): string {
    return this.params
      .map(originalParam => {
        if (/(^\s+)|(\s+$)|[,)]/g.test(originalParam)) {
          return `[[${originalParam
            .replace(/\\/g, '\\\\')
            .replace(/(\]\]\s*)([,)])/g, '$1\\$2')}]]`;
        } else {
          return originalParam.replace(/\\/g, '\\\\');
        }
      })
      .join(', ');
  }

  toFSH(): string {
    let printablePath: string;
    if (this.pathArray.length) {
      printablePath = this.pathArray.map(code => `#${code}`).join(' ') + ' ';
    } else {
      printablePath = this.path !== '' ? `${this.path} ` : '';
    }
    const paramPart = this.params.length > 0 ? `(${this.fshifyParameters()})` : '';
    return `* ${printablePath}insert ${this.ruleSet}${paramPart}`;
  }
}
