grammar FSH;

doc:                entity*;
entity:             alias | profile | extension | invariant | instance | valueSet | codeSystem;

alias:              KW_ALIAS SEQUENCE EQUAL SEQUENCE;

profile:            KW_PROFILE SEQUENCE sdMetadata+ sdRule*;
extension:          KW_EXTENSION SEQUENCE sdMetadata* sdRule*;
sdMetadata:         parent | id | title | description;
sdRule:             cardRule | flagRule | valueSetRule | fixedValueRule | containsRule | onlyRule | obeysRule | caretValueRule;

instance:           KW_INSTANCE SEQUENCE instanceMetadata* fixedValueRule*;
instanceMetadata:   instanceOf | title;

invariant:          KW_INVARIANT SEQUENCE invariantMetadata+;
invariantMetadata:  description | expression | xpath | severity;

valueSet:           KW_VALUESET SEQUENCE vsMetadata* vsComponent*;
vsMetadata:         id | title | description;
codeSystem:         KW_CODESYSTEM SEQUENCE csMetadata* concept*;
csMetadata:         id | title | description;

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
vsComponent:        STAR KW_EXCLUDE? ( vsConceptComponent | vsFilterComponent );
vsConceptComponent: code vsComponentFrom?
                    | COMMA_DELIMITED_CODES vsComponentFrom;
vsFilterComponent:  KW_CODES vsComponentFrom (KW_WHERE vsFilterList)?;
vsComponentFrom:    KW_FROM (vsFromSystem (KW_AND vsFromValueset)? | vsFromValueset (KW_AND vsFromSystem)?);
vsFromSystem:       KW_SYSTEM SEQUENCE;
vsFromValueset:     KW_VSREFERENCE (SEQUENCE | COMMA_DELIMITED_SEQUENCES);
vsFilterList:       (vsFilterDefinition KW_AND)* vsFilterDefinition;
vsFilterDefinition: SEQUENCE vsFilterOperator vsFilterValue;
vsFilterOperator:   EQUAL | SEQUENCE;
vsFilterValue:      code | REGEX | STRING;

// MISC
path:               SEQUENCE;
paths:              COMMA_DELIMITED_SEQUENCES;
caretPath:          CARET_SEQUENCE;
flag:               KW_MOD | KW_MS | KW_SU;
strength:           KW_EXAMPLE | KW_PREFERRED | KW_EXTENSIBLE | KW_REQUIRED;
value:              STRING | MULTILINE_STRING | NUMBER | DATETIME | TIME | code | quantity | ratio | bool ;
item:               SEQUENCE CARD flag*;
code:               CODE STRING?;
concept:            code STRING?;
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
KW_CODESYSTEM:      'CodeSystem' WS* ':';
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
KW_EXCLUDE:         'exclude';
KW_CODES:           'codes';
KW_WHERE:           'where';
KW_VSREFERENCE:     'valueset';
KW_SYSTEM:          'system';

// SYMBOLS
EQUAL:              '=';
STAR:               '*'  [0-9]*;
COLON:              ':';
COMMA:              ',';

// PATTERNS

                 //  "    CHARS    "
STRING:             '"' (~[\\"] | '\\"' | '\\\\')* '"';

                 //  """ CHARS """
MULTILINE_STRING:   '"""' .*? '"""';

                 //  +/- ? DIGITS( .  DIGITS)?
NUMBER:             [+\-]? [0-9]+('.' [0-9]+)?;

                 //   '  UCUM UNIT   '
UNIT:               '\'' (~[\\'])* '\'';

                 // SYSTEM     #  SYSTEM
CODE:               SEQUENCE? '#' (SEQUENCE | CONCEPT_STRING);


CONCEPT_STRING:      '"' (~[ \t\r\n\f\\"] | '\\"' | '\\\\')+ (WS (~[ \t\r\n\f\\"] | '\\"' | '\\\\')+)* '"';

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

                 // '/' EXPRESSION '/'
REGEX:              '/' ('\\/' | ~[/\r\n])+ '/';


COMMA_DELIMITED_CODES: (CODE (WS+ STRING)? WS* COMMA WS+)+ CODE (WS+ STRING)?;

                        // (NON-WS     ,   WS )+ NON-WS
COMMA_DELIMITED_SEQUENCES: (SEQUENCE COMMA WS+)+ SEQUENCE;

                 // NON-WHITESPACE
SEQUENCE:           ~[ \t\r\n\f]+;



// FRAGMENTS
fragment WS: [ \t\r\n\f];

// IGNORED TOKENS
WHITESPACE:         WS -> channel(HIDDEN);
BLOCK_COMMENT:      '/*' .*? '*/' -> skip;
LINE_COMMENT:       '//' ~[\r\n]* -> skip;