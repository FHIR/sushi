lexer grammar FSHLexer;

// KEYWORDS
KW_ALIAS:           'Alias' WS* ':';
KW_PROFILE:         'Profile' WS* ':';
KW_EXTENSION:       'Extension' WS* ':';
KW_INSTANCE:        'Instance' WS* ':';
KW_INSTANCEOF:      'InstanceOf' WS* ':';
KW_INVARIANT:       'Invariant' WS* ':';
KW_VALUESET:        'ValueSet' WS* ':';
KW_CODESYSTEM:      'CodeSystem' WS* ':';
KW_RULESET:         'RuleSet' WS* ':' -> pushMode(RULESET_OR_INSERT);
KW_MAPPING:         'Mapping' WS* ':';
KW_LOGICAL:         'Logical' WS* ':';
KW_RESOURCE:        'Resource' WS* ':';
KW_PARENT:          'Parent' WS* ':';
KW_ID:              'Id' WS* ':';
KW_TITLE:           'Title' WS* ':';
KW_DESCRIPTION:     'Description' WS* ':';
KW_EXPRESSION:      'Expression' WS* ':';
KW_XPATH:           'XPath' WS* ':';
KW_SEVERITY:        'Severity' WS* ':';
KW_USAGE:           'Usage' WS* ':';
KW_SOURCE:          'Source' WS* ':';
KW_TARGET:          'Target' WS* ':';
KW_MOD:             '?!';
KW_MS:              'MS';
KW_SU:              'SU';
KW_TU:              'TU';
KW_NORMATIVE:       'N';
KW_DRAFT:           'D';
KW_FROM:            'from';
KW_EXAMPLE:         '(' WS* 'example' WS* ')';
KW_PREFERRED:       '(' WS* 'preferred' WS* ')';
KW_EXTENSIBLE:      '(' WS* 'extensible' WS* ')';
KW_REQUIRED:        '(' WS* 'required' WS* ')';
KW_CONTAINS:        'contains';
KW_NAMED:           'named';
KW_AND:             'and';
KW_ONLY:            'only';
KW_OR:              'or';
KW_OBEYS:           'obeys';
KW_TRUE:            'true';
KW_FALSE:           'false';
KW_INCLUDE:         'include';
KW_EXCLUDE:         'exclude';
KW_CODES:           'codes';
KW_WHERE:           'where';
KW_VSREFERENCE:     'valueset';
KW_SYSTEM:          'system';
KW_EXACTLY:         '(' WS* 'exactly' WS* ')';
KW_INSERT:          'insert' -> pushMode(RULESET_OR_INSERT);
KW_CONTENTREFERENCE:'contentReference';

// SYMBOLS
EQUAL:              '=';
STAR:               ([\r\n] | LINE_COMMENT) WS* '*' [ \u00A0];
COLON:              ':';
COMMA:              ',';
ARROW:              '->';

// PATTERNS

                 //  "    CHARS    "
STRING:             '"' (~[\\"] | '\\u' | '\\r' | '\\n' | '\\t' | '\\"' | '\\\\')* '"';

                 //  """ CHARS """
MULTILINE_STRING:   '"""' .*? '"""';

                 //  +/- ? DIGITS( .  DIGITS)? (e/E   +/- ? DIGITS)?
NUMBER:             [+\-]? [0-9]+('.' [0-9]+)? ([eE] [+\-]? [0-9]+)?;

                 //   '  UCUM UNIT   '
UNIT:               '\'' (~[\\'])* '\'';

                 // SYSTEM     #  SYSTEM
CODE:               SEQUENCE? '#' (SEQUENCE | CONCEPT_STRING);


CONCEPT_STRING:      '"' (NONWS_STR | '\\"' | '\\\\')+ (WS (NONWS_STR | '\\"' | '\\\\')+)* '"';

                 //        YEAR         ( -   MONTH   ( -    DAY    ( T TIME )?)?)?
DATETIME:           [0-9][0-9][0-9][0-9]('-'[0-9][0-9]('-'[0-9][0-9]('T' TIME)?)?)?;

                 //    HOUR   ( :   MINUTE  ( :   SECOND  ( . MILLI )?)?)?( Z  |     +/-        HOUR   :  MINUTE   )?
TIME:               [0-9][0-9](':'[0-9][0-9](':'[0-9][0-9]('.'[0-9]+)?)?)?('Z' | ('+' | '-')[0-9][0-9]':'[0-9][0-9])?;

                 // DIGITS  ..  (DIGITS |  * )
CARD:               ([0-9]+)? '..' ([0-9]+ | '*')?;

              //  Reference       (        ITEM         |         ITEM         )
REFERENCE:       'Reference' WS* '(' WS* SEQUENCE WS* (WS 'or' WS+ SEQUENCE WS*)* ')';

                 // Canonical       (              URL|VERSION               or              URL|VERSION             )
CANONICAL     :    'Canonical' WS* '(' WS* SEQUENCE ('|' SEQUENCE)? WS* (WS 'or' WS+ SEQUENCE ('|' SEQUENCE)? WS*)* ')';

                 //  ^  NON-WHITESPACE
CARET_SEQUENCE:     '^' NONWS+;

                 // '/' EXPRESSION '/'
REGEX:              '/' ('\\/' | ~[*/\r\n])('\\/' | ~[/\r\n])* '/';

PARAMETER_DEF_LIST: '(' (SEQUENCE WS* COMMA WS*)* SEQUENCE ')';

// BLOCK_COMMENT must precede SEQUENCE so that a block comment without whitespace does not become a SEQUENCE
BLOCK_COMMENT:      '/*' .*? '*/' -> skip;
                 // NON-WHITESPACE
SEQUENCE:           NONWS+;



// FRAGMENTS
fragment WS: [ \t\r\n\f\u00A0];
fragment NONWS: ~[ \t\r\n\f\u00A0];
fragment NONWS_STR: ~[ \t\r\n\f\u00A0\\"];

// IGNORED TOKENS
WHITESPACE:         WS -> channel(HIDDEN);
LINE_COMMENT:       '//' ~[\r\n]* [\r\n] -> skip;

mode RULESET_OR_INSERT;
PARAM_RULESET_REFERENCE:      WS* RSNONWS+ WS* '(' -> pushMode(PARAM_RULESET_OR_INSERT);
RULESET_REFERENCE:            WS* RSNONWS+ -> popMode;
fragment RSNONWS: ~[ \t\r\n\f\u00A0(];

mode PARAM_RULESET_OR_INSERT;
BRACKETED_PARAM: WS* '[[' ( ~[\]] | (']'~[\]]) | (']]' WS* ~[,)]) )+ ']]' WS* ',';
LAST_BRACKETED_PARAM: WS* '[[' ( ~[\]] | (']'~[\]]) | (']]' WS* ~[,)]) )+ ']]' WS* ')' -> popMode, popMode;
PLAIN_PARAM: WS* ('\\)' | '\\,' | '\\\\' | ~[),])* WS* ',';
LAST_PLAIN_PARAM: WS* ('\\)' | '\\,' | '\\\\' | ~[),])* WS* ')' -> popMode, popMode;
