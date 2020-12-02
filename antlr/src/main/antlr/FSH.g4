grammar FSH;

options { tokenVocab = FSHLexer; }

doc:                entity* EOF;
entity:             alias | profile | extension | invariant | instance | valueSet | codeSystem | ruleSet | paramRuleSet | mapping;

alias:              KW_ALIAS SEQUENCE EQUAL SEQUENCE;

profile:            KW_PROFILE SEQUENCE sdMetadata+ sdRule*;
extension:          KW_EXTENSION SEQUENCE sdMetadata* sdRule*;
sdMetadata:         parent | id | title | description | mixins;
sdRule:             cardRule | flagRule | valueSetRule | fixedValueRule | containsRule | onlyRule | obeysRule | caretValueRule | insertRule;

instance:           KW_INSTANCE SEQUENCE instanceMetadata* instanceRule*;
instanceMetadata:   instanceOf | title | description | usage | mixins;
instanceRule:       fixedValueRule | insertRule;

invariant:          KW_INVARIANT SEQUENCE invariantMetadata+;
invariantMetadata:  description | expression | xpath | severity;

valueSet:           KW_VALUESET SEQUENCE vsMetadata* vsRule*;
vsMetadata:         id | title | description;
vsRule:             vsComponent | caretValueRule | insertRule;
codeSystem:         KW_CODESYSTEM SEQUENCE csMetadata* csRule*;
csMetadata:         id | title | description;
csRule:             concept | caretValueRule | insertRule;

ruleSet:            KW_RULESET SEQUENCE ruleSetRule+;
ruleSetRule:        sdRule | concept | vsComponent;

paramRuleSet:       KW_RULESET SEQUENCE PARAMETER_DEF_LIST paramRuleSetRule+;
paramRuleSetRule:   STAR
                    ( KW_INSTANCEOF
                    | KW_MIXINS
                    | KW_PARENT
                    | KW_ID
                    | KW_TITLE
                    | KW_DESCRIPTION
                    | KW_EXPRESSION
                    | KW_XPATH
                    | KW_SEVERITY
                    | KW_USAGE
                    | KW_SOURCE
                    | KW_TARGET
                    | KW_MOD
                    | KW_MS
                    | KW_SU
                    | KW_TU
                    | KW_NORMATIVE
                    | KW_DRAFT
                    | KW_FROM
                    | KW_EXAMPLE
                    | KW_PREFERRED
                    | KW_EXTENSIBLE
                    | KW_REQUIRED
                    | KW_CONTAINS
                    | KW_NAMED
                    | KW_AND
                    | KW_ONLY
                    | KW_OR
                    | KW_OBEYS
                    | KW_TRUE
                    | KW_FALSE
                    | KW_INCLUDE
                    | KW_EXCLUDE
                    | KW_CODES
                    | KW_WHERE
                    | KW_VSREFERENCE
                    | KW_SYSTEM
                    | KW_UNITS
                    | KW_EXACTLY
                    | KW_INSERT
                    | EQUAL
                    | COLON
                    | COMMA
                    | ARROW
                    | STRING
                    | MULTILINE_STRING
                    | NUMBER
                    | UNIT
                    | CODE
                    | CONCEPT_STRING
                    | DATETIME
                    | TIME
                    | CARD
                    | OR_REFERENCE
                    | PIPE_REFERENCE
                    | CANONICAL
                    | CARET_SEQUENCE
                    | REGEX
                    | COMMA_DELIMITED_CODES
                    | PARAMETER_LIST
                    // | APPLIED_PARAMETER_LIST
                    | COMMA_DELIMITED_SEQUENCES
                    | SEQUENCE
                    )+; // how exhausting!

mapping:            KW_MAPPING SEQUENCE mappingMetadata* mappingEntityRule*;
mappingMetadata:    id | source | target | description | title;
mappingEntityRule:  mappingRule | insertRule;

// METADATA FIELDS
parent:             KW_PARENT SEQUENCE;
id:                 KW_ID SEQUENCE;
title:              KW_TITLE STRING;
description:        KW_DESCRIPTION (STRING | MULTILINE_STRING);
expression:         KW_EXPRESSION STRING;
xpath:              KW_XPATH STRING;
severity:           KW_SEVERITY CODE;
instanceOf:         KW_INSTANCEOF SEQUENCE;
usage:              KW_USAGE CODE;
mixins:             KW_MIXINS ((SEQUENCE KW_AND)* SEQUENCE | COMMA_DELIMITED_SEQUENCES);
source:             KW_SOURCE SEQUENCE;
target:             KW_TARGET STRING;


// RULES
cardRule:           STAR path CARD flag*;
flagRule:           STAR ((path KW_AND)* path | paths) flag+;
valueSetRule:       STAR path KW_UNITS? KW_FROM SEQUENCE strength?;
fixedValueRule:     STAR path KW_UNITS? EQUAL value KW_EXACTLY?;
containsRule:       STAR path KW_CONTAINS item (KW_AND item)*;
onlyRule:           STAR path KW_ONLY targetType (KW_OR targetType)*;
obeysRule:          STAR path? KW_OBEYS SEQUENCE (KW_AND SEQUENCE)*;
caretValueRule:     STAR path? caretPath EQUAL value;
mappingRule:        STAR path? ARROW STRING STRING? CODE?;
insertRule:         STAR KW_INSERT RULESET_NAME insertRuleParams?;
insertRuleParams:   PARAMETER_LIST PARAM_CONTENT* END_PARAM_LIST;

// VALUESET COMPONENTS
vsComponent:        STAR ( KW_INCLUDE | KW_EXCLUDE )? ( vsConceptComponent | vsFilterComponent );
vsConceptComponent: code vsComponentFrom?
                    | (code KW_AND)+ code vsComponentFrom
                    | COMMA_DELIMITED_CODES vsComponentFrom;
vsFilterComponent:  KW_CODES vsComponentFrom (KW_WHERE vsFilterList)?;
vsComponentFrom:    KW_FROM (vsFromSystem (KW_AND vsFromValueset)? | vsFromValueset (KW_AND vsFromSystem)?);
vsFromSystem:       KW_SYSTEM SEQUENCE;
vsFromValueset:     KW_VSREFERENCE ((SEQUENCE KW_AND)* SEQUENCE | COMMA_DELIMITED_SEQUENCES);
vsFilterList:       (vsFilterDefinition KW_AND)* vsFilterDefinition;
vsFilterDefinition: SEQUENCE vsFilterOperator vsFilterValue?;
vsFilterOperator:   EQUAL | SEQUENCE;
vsFilterValue:      code | KW_TRUE | KW_FALSE | REGEX | STRING;

// MISC
path:               SEQUENCE | KW_SYSTEM;
paths:              COMMA_DELIMITED_SEQUENCES;
caretPath:          CARET_SEQUENCE;
flag:               KW_MOD | KW_MS | KW_SU | KW_TU | KW_NORMATIVE | KW_DRAFT;
strength:           KW_EXAMPLE | KW_PREFERRED | KW_EXTENSIBLE | KW_REQUIRED;
value:              SEQUENCE | STRING | MULTILINE_STRING | NUMBER | DATETIME | TIME | reference | canonical | code | quantity | ratio | bool ;
item:               SEQUENCE (KW_NAMED SEQUENCE)? CARD flag*;
code:               CODE STRING?;
concept:            STAR code (STRING | MULTILINE_STRING)?;
quantity:           NUMBER UNIT;
ratio:              ratioPart COLON ratioPart;
reference:          (OR_REFERENCE | PIPE_REFERENCE) STRING?;
canonical:          CANONICAL;
ratioPart:          NUMBER | quantity;
bool:               KW_TRUE | KW_FALSE;
targetType:         SEQUENCE | reference;