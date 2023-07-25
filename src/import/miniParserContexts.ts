import { ParserRuleContext, TerminalNode } from 'antlr4';

export interface RuleSetContext extends ParserRuleContext {
  someRule(): SomeRuleContext[];
}

export interface SomeRuleContext extends ParserRuleContext {
  STAR(): ParserRuleContext & TerminalNode;
  rulePart(): RulePartContext[];
}

export interface RulePartContext extends ParserRuleContext {
  SEQUENCE(): ParserRuleContext;
  STRING(): ParserRuleContext;
  MULTILINE_STRING(): ParserRuleContext;
}
