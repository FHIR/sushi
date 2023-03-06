import { ParamRuleSet } from '../fshtypes';
import * as pc from './miniParserContexts';
import MiniFSHVisitor from './generated/MiniFSHVisitor';
import { CommonTokenStream, InputStream } from 'antlr4';
import MiniFSHLexer from './generated/MiniFSHLexer';
import MiniFSHParser from './generated/MiniFSHParser';
import { EOL } from 'os';
import escapeRegExp from 'lodash/escapeRegExp';

export function applyRuleSetSubstitutions(ruleSet: ParamRuleSet, values: string[]): string {
  const importer = new MiniFSHImporter(ruleSet, values);
  return importer.transformRuleSet();
}

class MiniFSHImporter extends MiniFSHVisitor {
  private bracketParamUsage: RegExp;
  plainParamUsage: RegExp;

  constructor(private ruleSet: ParamRuleSet, private values: string[]) {
    super();
    const escapedParameters = this.ruleSet.parameters.map(escapeRegExp).join('|');
    this.bracketParamUsage = new RegExp(
      `\\[\\[{\\s*(${escapedParameters})\\s*}\\]\\]|{\\s*(${escapedParameters})\\s*}`,
      'g'
    );
    this.plainParamUsage = new RegExp(`{\\s*(${escapedParameters})\\s*}`, 'g');
  }

  transformRuleSet(): string {
    const chars = new InputStream(this.ruleSet.contents);
    const lexer = new MiniFSHLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new MiniFSHParser(tokens);
    parser.buildParseTrees = true;
    // @ts-ignore
    const ctx = parser.ruleSet() as pc.RuleSetContext;
    const transformedRules = this.visitRuleSet(ctx);
    return `RuleSet: ${this.ruleSet.name}${EOL}${transformedRules.join(EOL)}`;
  }

  visitRuleSet(ctx: pc.RuleSetContext): string[] {
    return ctx.someRule().map(ruleCtx => this.visitSomeRule(ruleCtx));
  }

  visitSomeRule(ctx: pc.SomeRuleContext): string {
    const ruleParts = ctx.rulePart();
    const regularInsert = ruleParts[0].getText() === 'insert' && ruleParts.length > 1;
    const pathInsert = ruleParts?.[1].getText() === 'insert';
    if (regularInsert || pathInsert) {
      // do auto-bracketed substitution
      return this.doAutoBracketSubstitution(ctx);
    } else {
      // do regular substitution
      return this.doRegularSubstitution(ctx);
    }
  }

  doAutoBracketSubstitution(ctx: pc.SomeRuleContext): string {
    const ruleText = ctx
      .rulePart()
      .map(rpCtx => rpCtx.getText())
      .join(' ');
    const firstLeftParen = ruleText.indexOf('(');
    // track the first left parentheses because we want to rebracket parameters,
    // which appear after the first left parentheses.
    // if there is no left parentheses, there are no parameters,
    // so don't bracket anything
    return (
      '* ' +
      ruleText.replace(this.bracketParamUsage, (fullMatch, bracketParamName, paramName, offset) => {
        let matchIndex: number;
        if (fullMatch.startsWith('[')) {
          matchIndex = this.ruleSet.parameters.indexOf(bracketParamName);
        } else {
          matchIndex = this.ruleSet.parameters.indexOf(paramName);
        }
        if (matchIndex > -1) {
          if (firstLeftParen !== -1 && offset > firstLeftParen) {
            return `[[${this.values[matchIndex]
              .replace(/\]\],/g, ']]\\,')
              .replace(/\]\]\)/g, ']]\\)')}]]`;
          } else {
            return this.values[matchIndex];
          }
        } else {
          return '';
        }
      })
    );
  }

  doRegularSubstitution(ctx: pc.SomeRuleContext): string {
    const ruleText = ctx
      .rulePart()
      .map(rpCtx => rpCtx.getText())
      .join(' ');
    return (
      '* ' +
      ruleText.replace(this.plainParamUsage, (fullMatch, paramName) => {
        const matchIndex = this.ruleSet.parameters.indexOf(paramName);
        if (matchIndex > -1) {
          return this.values[matchIndex];
        } else {
          return '';
        }
      })
    );
  }
}
