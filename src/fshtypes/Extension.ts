import { SourceInfo } from './FshEntity';
import { FshStructure } from './FshStructure';
import { fshifyString } from './common';
import { SdRule } from './rules';
import { EOL } from 'os';

export class Extension extends FshStructure {
  rules: SdRule[];
  contexts: ExtensionContext[];

  constructor(public name: string) {
    super(name);
    // Init the parent to 'Extension', as this is what 99% of extensions do.
    // This can still be overridden via the FSH syntax (using Parent: keyword).
    this.parent = 'Extension'; // init to 'Extension'
    this.contexts = [];
  }

  get constructorName() {
    return 'Extension';
  }

  metadataToFSH(): string {
    const sdMetadata = super.metadataToFSH();
    const contextLines: string[] = [];
    this.contexts.forEach(extContext => {
      if (extContext.isQuoted) {
        contextLines.push(`Context: "${fshifyString(extContext.value)}"`);
      } else {
        contextLines.push(`Context: ${extContext.value}`);
      }
    });
    const contextValue = this.contexts
      .map(extContext =>
        extContext.isQuoted ? `"${fshifyString(extContext.value)}"` : extContext.value
      )
      .join(', ');
    if (contextValue.length > 0) {
      return `${sdMetadata}${EOL}Context: ${contextValue}`;
    } else {
      return sdMetadata;
    }
  }

  toFSH(): string {
    const metadataFSH = this.metadataToFSH();
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}

export type ExtensionContext = {
  value: string;
  isQuoted: boolean;
  sourceInfo?: SourceInfo;
};
