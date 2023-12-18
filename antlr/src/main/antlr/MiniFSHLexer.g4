/*
 * MiniFSHLexer.g4: A minimal ANTLR v4 lexer representation useful only in the context of certain
 * functions within the SUSHI. See FSHLexer.g4 for a more complete FSH lexer grammar.
 */
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
