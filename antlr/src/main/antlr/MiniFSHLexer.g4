lexer grammar MiniFSHLexer;

KW_RULESET:         'RuleSet' WS* ':' -> pushMode(PARAMETER_LIST_MODE);
STAR:               '*';
STRING:             '"' (~[\\"] | '\\r' | '\\n' | '\\t' | '\\"' | '\\\\')* '"';
MULTILINE_STRING:   '"""' .*? '"""';
SEQUENCE:           NONWS+;

// FRAGMENTS
fragment WS: [ \t\r\n\f\u00A0];
fragment NONWS: ~[ \t\r\n\f\u00A0];
fragment NONWS_STR: ~[ \t\r\n\f\u00A0\\"];

// IGNORED TOKENS
WHITESPACE:         WS -> channel(HIDDEN);
LINE_COMMENT:       '//' ~[\r\n]* [\r\n] -> skip;

mode PARAMETER_LIST_MODE;
PARAMETER_LIST:     '(' PARAMETER  (',' PARAMETER)* ')' -> popMode;
fragment PARAMETER: WS* ('\\)' | '\\,' | '\\\\' | ~[),])* WS*;