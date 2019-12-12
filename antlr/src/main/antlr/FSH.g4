grammar FSH;

doc:                entity*;
entity:             alias | profile | extension | invariant | instance | valueSet;

alias:              KW_ALIAS SEQUENCE EQUAL SEQUENCE;

profile:            KW_PROFILE SEQUENCE sdMetadata+ sdRule*;
extension:          KW_EXTENSION SEQUENCE sdMetadata* sdRule*;
sdMetadata:         parent | id | title | description;
sdRule:             cardRule | flagRule | valueSetRule | fixedValueRule | containsRule | onlyRule | obeysRule | caretValueRule;

instance:           KW_INSTANCE SEQUENCE instanceMetadata* fixedValueRule*;
instanceMetadata:   instanceOf | title;

invariant:          KW_INVARIANT SEQUENCE invariantMetadata+;
invariantMetadata:  description | expression | xpath | severity;

valueSet:           KW_VALUESET SEQUENCE STRING? vsMetadata* vsComponent+;
vsMetadata:         description;

// METADATA FIELDS
parent:             KW_PARENT SEQUENCE;
id:                 KW_ID SEQUENCE;
title:              KW_TITLE STRING;
description:        KW_DESCRIPTION (STRING | MULTILINE_STRING);
expression:         KW_EXPRESSION STRING;
xpath:              KW_XPATH STRING;
severity:           KW_SEVERITY CODE;
instanceOf:         KW_INSTANCEOF SEQUENCE;


// RULES
cardRule:           STAR path CARD flag*;
flagRule:           STAR (path | paths) flag+;
valueSetRule:       STAR path KW_FROM SEQUENCE strength?;
fixedValueRule:     STAR path EQUAL value;
containsRule:       STAR path KW_CONTAINS item (KW_AND item)*;
onlyRule:           STAR path KW_ONLY targetType (KW_OR targetType)*;
obeysRule:          STAR path? KW_OBEYS SEQUENCE (KW_AND SEQUENCE)*;
caretValueRule:     STAR path? caretPath EQUAL value;

// VALUESET COMPONENTS
vsComponent:        vsTerm | vsReference | vsFilter;
vsTerm:             code STRING?;
vsReference:        STAR (KW_INCLUDE | KW_EXCLUDE) KW_VSREFERENCE SEQUENCE;
// Filter definitions are usually: System Property Operator Value
// However, exceptions exist:
// Property['system'] Operator Value: system = ABCD
// System Operator Value: ABCD descendant-of #1234
vsFilter:           STAR (KW_INCLUDE | KW_EXCLUDE) filterDefinition;
filterDefinition:   KW_SYSTEM filterOperator filterValue
                    | SEQUENCE SEQUENCE? filterOperator filterValue;
filterOperator:     EQUAL | SEQUENCE;
filterValue:        code | REGEX | COMMA_DELIMITED_SEQUENCES | SEQUENCE;

// MISC
path:               SEQUENCE;
paths:              COMMA_DELIMITED_SEQUENCES;
caretPath:          CARET_SEQUENCE;
flag:               KW_MOD | KW_MS | KW_SU;
strength:           KW_EXAMPLE | KW_PREFERRED | KW_EXTENSIBLE | KW_REQUIRED;
value:              STRING | MULTILINE_STRING | NUMBER | DATETIME | TIME | code | quantity | ratio | bool ;
item:               SEQUENCE CARD flag*;
code:               CODE STRING?;
quantity:           NUMBER UNIT;
ratio:              ratioPart COLON ratioPart;
ratioPart:          NUMBER | quantity;
bool:               KW_TRUE | KW_FALSE;
targetType:         SEQUENCE | REFERENCE;

// KEYWORDS
KW_ALIAS:           'Alias' WS* ':';
KW_PROFILE:         'Profile' WS* ':';
KW_EXTENSION:       'Extension' WS* ':';
KW_INSTANCE:        'Instance' WS* ':';
KW_INSTANCEOF:      'InstanceOf' WS* ':';
KW_INVARIANT:       'Invariant' WS* ':';
KW_VALUESET:        'ValueSet' WS* ':';
KW_PARENT:          'Parent' WS* ':';
KW_ID:              'Id' WS* ':';
KW_TITLE:           'Title' WS* ':';
KW_DESCRIPTION:     'Description' WS* ':';
KW_EXPRESSION:      'Expression' WS* ':';
KW_XPATH:           'XPath' WS* ':';
KW_SEVERITY:        'Severity' WS* ':';
KW_MOD:             '?!';
KW_MS:              'MS';
KW_SU:              'SU';
KW_FROM:            'from';
KW_EXAMPLE:         '(' WS* 'example' WS* ')';
KW_PREFERRED:       '(' WS* 'preferred' WS* ')';
KW_EXTENSIBLE:      '(' WS* 'extensible' WS* ')';
KW_REQUIRED:        '(' WS* 'required' WS* ')';
KW_CONTAINS:        'contains';
KW_AND:             'and';
KW_ONLY:            'only';
KW_OR:              'or';
KW_OBEYS:           'obeys';
KW_TRUE:            'true';
KW_FALSE:           'false';
KW_INCLUDE:         'include';
KW_EXCLUDE:         'exclude';
KW_VSREFERENCE:     'valueset';
KW_SYSTEM:          'system';

// SYMBOLS
EQUAL:              '=';
STAR:               '*';
COLON:              ':';
COMMA:              ',';

// PATTERNS

                 //  "    CHARS    "
STRING:             '"' (~[\\"])* '"';

                 //  """ CHARS """
MULTILINE_STRING:   '"""' .*? '"""';

                 //  +/- ? DIGITS( .  DIGITS)?
NUMBER:             [+\-]? [0-9]+('.' [0-9]+)?;

                 //   '  UCUM UNIT   '
UNIT:               '\'' (~[\\'])* '\'';

                 // SYSTEM     #  SYSTEM
CODE:               SEQUENCE? '#' SEQUENCE;

                 //        YEAR         ( -   MONTH   ( -    DAY    ( T TIME )?)?)?
DATETIME:           [0-9][0-9][0-9][0-9]('-'[0-9][0-9]('-'[0-9][0-9]('T' TIME)?)?)?;

                 //    HOUR   ( :   MINUTE  ( :   SECOND  ( . MILLI )?)?)?( Z  |     +/-        HOUR   :  MINUTE   )?
TIME:               [0-9][0-9](':'[0-9][0-9](':'[0-9][0-9]('.'[0-9]+)?)?)?('Z' | ('+' | '-')[0-9][0-9]':'[0-9][0-9])?;

                 // DIGITS  ..  (DIGITS |  * )
CARD:               [0-9]+ '..' ([0-9]+ | '*');

                 //  Reference       (        ITEM         |         ITEM         )
REFERENCE:          'Reference' WS* '(' WS* SEQUENCE WS* ('|' WS* SEQUENCE WS*)* ')';

                 //  ^  NON-WHITESPACE
CARET_SEQUENCE:     '^' ~[ \t\r\n\f]+;

                 // '/' EXPRESSION '/' FLAGS
REGEX:              '/' ('\\/' | ~[/\r\n])+ '/' REGEX_FLAGS;

                        // (NON-WS     ,   WS )+ NON-WS
COMMA_DELIMITED_SEQUENCES: (SEQUENCE COMMA WS+)+ SEQUENCE;

                 // NON-WHITESPACE
SEQUENCE:           ~[ \t\r\n\f]+;



// FRAGMENTS
fragment WS: [ \t\r\n\f];
fragment REGEX_FLAGS: [imsu]? [imsu]? [imsu]? [imsu]? ;

// IGNORED TOKENS
WHITESPACE:         WS -> channel(HIDDEN);
BLOCK_COMMENT:      '/*' .*? '*/' -> skip;
LINE_COMMENT:       '//' ~[\r\n]* -> skip;