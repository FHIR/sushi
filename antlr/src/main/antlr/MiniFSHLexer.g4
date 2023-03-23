lexer grammar MiniFSHLexer;

STAR:               ([\r\n] | LINE_COMMENT) WS* '*' [ \u00A0];
STRING:             '"' (~[\\"] | '\\u' | '\\r' | '\\n' | '\\t' | '\\"' | '\\\\')* '"';
MULTILINE_STRING:   '"""' .*? '"""';
SEQUENCE:           NONWS+;

// FRAGMENTS
fragment WS: [ \t\r\n\f\u00A0];
fragment NONWS: ~[ \t\r\n\f\u00A0];
fragment NONWS_STR: ~[ \t\r\n\f\u00A0\\"];

// IGNORED TOKENS
WHITESPACE:         WS -> channel(HIDDEN);
LINE_COMMENT:       '//' ~[\r\n]* [\r\n] -> skip;
